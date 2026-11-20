"""IVR tree schema and validation.

The ``ivr`` field of an agency stores a tree of nodes as JSON. This module
defines a recursive Pydantic model that validates the tree's shape without being
so strict that it rejects the fields produced by the visual editor (e.g. canvas
``position``). The field set was derived from real production data.

Node types (see README):
    menu         -> submenu reached by a digit (root menu has no digit/label)
    timeout      -> branch taken when no digit is pressed
    ring_group   -> rings several extensions simultaneously for N rings
    ring_single  -> rings a single extension for N rings
    voicemail    -> forward to a voicemail box
    cadd         -> redirect to CADD with a destination number

Only the structural invariants we are confident about are enforced:
    * every node has a non-empty ``id`` and a ``type`` within the known set;
    * ``children`` (when present) is a list of valid nodes (recursive);
    * ``rings`` (when present) is a non-negative integer.
Unknown/extra keys are allowed so the frontend can attach view-only metadata.
"""

from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class NodeType(str, Enum):
    MENU = "menu"
    TIMEOUT = "timeout"
    RING_GROUP = "ring_group"
    RING_SINGLE = "ring_single"
    VOICEMAIL = "voicemail"
    CADD = "cadd"


class IVRNode(BaseModel):
    # Allow extra keys (e.g. "position") so editor metadata does not break
    # validation; we only constrain the fields we rely on.
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1)
    type: NodeType

    # Common optional structural field.
    children: Optional[List["IVRNode"]] = None

    # Type-specific optional fields (validated loosely, matching real data).
    digit: Optional[str] = None          # menu
    label: Optional[str] = None          # menu, timeout
    extensions: Optional[List[str]] = None  # ring_group
    extension: Optional[str] = None      # ring_single
    rings: Optional[int] = Field(default=None, ge=0)  # ring_group, ring_single
    email: Optional[str] = None          # voicemail
    destination: Optional[str] = None    # cadd


# Resolve the forward reference to IVRNode in the recursive "children" field.
IVRNode.model_rebuild()

# The IVR tree is a list of top-level nodes.
IVRTree = List[IVRNode]


def validate_ivr(value: Any) -> Any:
    """Validate an IVR payload and return it normalized as plain JSON.

    ``None`` is allowed (an agency may have no IVR yet). A non-null value must be
    a list of valid IVR nodes. Raises ``pydantic.ValidationError`` otherwise.
    Returns a JSON-serializable structure (dicts/lists) ready to be stored.
    """
    if value is None:
        return None

    from pydantic import TypeAdapter

    adapter = TypeAdapter(IVRTree)
    nodes = adapter.validate_python(value)
    # Dump back to plain data, dropping unset/None keys we added, but keeping
    # any extra editor fields that were provided.
    return adapter.dump_python(nodes, exclude_none=True)
