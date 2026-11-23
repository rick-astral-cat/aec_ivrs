#!/usr/bin/env python3
"""
User management CLI for Dalton AEC IVRS.

Lets you administer users directly on the AWS server without manually
manipulating password hashes in SQLite.

Usage:
  python manage_users.py list
  python manage_users.py create --username rgarcia --password MySecurePassword123! \
      [--role editor] [--full-name "Ricardo Garcia"]
  python manage_users.py set-role --username rgarcia --role admin
  python manage_users.py set-name --username rgarcia --full-name "Ricardo Garcia"
  python manage_users.py reset-mfa --username admin
  python manage_users.py change-password --username admin --password NewPassword123!

Roles: admin (full access), editor (create/edit, no deletes), viewer (read-only).
"""

import argparse
import sys
from typing import Optional

from bootstrap import run_migrations
from database import session_scope
import models
from roles import DEFAULT_ROLE, Role
from services import user_service

ROLE_CHOICES = [r.value for r in Role]


def _get_user_or_exit(db, username: str) -> models.User:
    user = user_service.get_by_username(db, username)
    if not user:
        print(f"Error: user '{username}' not found.")
        sys.exit(1)
    return user


def list_users():
    with session_scope() as db:
        users = db.query(models.User).all()
        if not users:
            print("No users registered in the database.")
            return

        print(f"\n{'ID':<5} {'Username':<20} {'Full name':<25} {'Role':<8} {'MFA':<8} {'Active':<6}")
        print("-" * 77)
        for u in users:
            mfa_status = "Yes" if u.is_mfa_enabled else "Pending"
            active_status = "Yes" if u.is_active else "No"
            print(
                f"{u.id:<5} {u.username:<20} {(u.full_name or '-'):<25} "
                f"{u.role:<8} {mfa_status:<8} {active_status:<6}"
            )
        print()


def create_user(username: str, password: str, role: str, full_name: Optional[str]):
    with session_scope() as db:
        if user_service.get_by_username(db, username):
            print(f"Error: user '{username}' already exists.")
            sys.exit(1)

        user_service.create_user(
            db, username=username, password=password, role=Role(role), full_name=full_name
        )
        print(f"User '{username}' created successfully with role '{role}'.")
        print("On first login they will be asked to scan the QR code to set up MFA.")


def set_role(username: str, role: str):
    with session_scope() as db:
        user = _get_user_or_exit(db, username)
        previous = user.role
        user_service.set_role(db, user, Role(role))
        print(f"Role for '{username}' changed: {previous} -> {role}.")
        print("It takes effect on the user's next request (no re-login needed).")


def set_name(username: str, full_name: str):
    with session_scope() as db:
        user = _get_user_or_exit(db, username)
        user_service.set_full_name(db, user, full_name)
        print(f"Full name for '{username}' set to: {user.full_name or '(empty)'}.")


def reset_mfa(username: str):
    with session_scope() as db:
        user = _get_user_or_exit(db, username)
        user_service.reset_mfa(db, user)
        print(f"MFA reset for user '{username}'.")
        print("On their next login they will see a new QR code to link their Authenticator app.")


def change_password(username: str, new_password: str):
    with session_scope() as db:
        user = _get_user_or_exit(db, username)
        user_service.set_password(db, user, new_password)
        print(f"Password updated successfully for user '{username}'.")


def main():
    parser = argparse.ArgumentParser(description="AEC IVRS user administration")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # list subcommand
    subparsers.add_parser("list", help="List all users with their role and MFA status")

    # create subcommand
    create_p = subparsers.add_parser("create", help="Create a new user")
    create_p.add_argument("--username", required=True, help="Username or email")
    create_p.add_argument("--password", required=True, help="Initial password")
    create_p.add_argument(
        "--role", choices=ROLE_CHOICES, default=DEFAULT_ROLE.value,
        help=f"Global role (default: {DEFAULT_ROLE.value})",
    )
    create_p.add_argument("--full-name", help='Display name, e.g. "Ricardo Garcia"')

    # set-role subcommand
    role_p = subparsers.add_parser("set-role", help="Change a user's global role")
    role_p.add_argument("--username", required=True, help="Username")
    role_p.add_argument("--role", required=True, choices=ROLE_CHOICES, help="New role")

    # set-name subcommand
    name_p = subparsers.add_parser("set-name", help="Set a user's display name")
    name_p.add_argument("--username", required=True, help="Username")
    name_p.add_argument("--full-name", required=True, help="Display name (empty string clears it)")

    # reset-mfa subcommand
    reset_p = subparsers.add_parser("reset-mfa", help="Reset a user's MFA (to re-scan the QR)")
    reset_p.add_argument("--username", required=True, help="Username")

    # change-password subcommand
    pwd_p = subparsers.add_parser("change-password", help="Change a user's password")
    pwd_p.add_argument("--username", required=True, help="Username")
    pwd_p.add_argument("--password", required=True, help="New password")

    args = parser.parse_args()

    # Make sure the schema is up to date before touching any table.
    run_migrations()

    if args.command == "list":
        list_users()
    elif args.command == "create":
        create_user(args.username, args.password, args.role, args.full_name)
    elif args.command == "set-role":
        set_role(args.username, args.role)
    elif args.command == "set-name":
        set_name(args.username, args.full_name)
    elif args.command == "reset-mfa":
        reset_mfa(args.username)
    elif args.command == "change-password":
        change_password(args.username, args.password)


if __name__ == "__main__":
    main()
