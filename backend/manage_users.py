#!/usr/bin/env python3
"""
User management CLI for Dalton AEC IVRS.

Lets you administer users directly on the AWS server without manually
manipulating password hashes in SQLite.

Usage:
  python manage_users.py list
  python manage_users.py create --username admin --password MySecurePassword123!
  python manage_users.py reset-mfa --username admin
  python manage_users.py change-password --username admin --password NewPassword123!
"""

import argparse
import sys

from bootstrap import run_migrations
from database import session_scope
import models
from services import user_service


def list_users():
    with session_scope() as db:
        users = db.query(models.User).all()
        if not users:
            print("No users registered in the database.")
            return

        print(f"\n{'ID':<5} {'Username':<25} {'MFA Enabled':<12} {'Active':<8}")
        print("-" * 55)
        for u in users:
            mfa_status = "Yes" if u.is_mfa_enabled else "Pending"
            active_status = "Yes" if u.is_active else "No"
            print(f"{u.id:<5} {u.username:<25} {mfa_status:<12} {active_status:<8}")
        print()


def create_user(username: str, password: str):
    with session_scope() as db:
        if user_service.get_by_username(db, username):
            print(f"Error: user '{username}' already exists.")
            sys.exit(1)

        user_service.create_user(db, username=username, password=password)
        print(f"User '{username}' created successfully.")
        print("On first login they will be asked to scan the QR code to set up MFA.")


def reset_mfa(username: str):
    with session_scope() as db:
        user = user_service.get_by_username(db, username)
        if not user:
            print(f"Error: user '{username}' not found.")
            sys.exit(1)

        user_service.reset_mfa(db, user)
        print(f"MFA reset for user '{username}'.")
        print("On their next login they will see a new QR code to link their Authenticator app.")


def change_password(username: str, new_password: str):
    with session_scope() as db:
        user = user_service.get_by_username(db, username)
        if not user:
            print(f"Error: user '{username}' not found.")
            sys.exit(1)

        user_service.set_password(db, user, new_password)
        print(f"Password updated successfully for user '{username}'.")


def main():
    parser = argparse.ArgumentParser(description="AEC IVRS user administration")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # list subcommand
    subparsers.add_parser("list", help="List all users and their MFA status")

    # create subcommand
    create_p = subparsers.add_parser("create", help="Create a new user")
    create_p.add_argument("--username", required=True, help="Username or email")
    create_p.add_argument("--password", required=True, help="Initial password")

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
        create_user(args.username, args.password)
    elif args.command == "reset-mfa":
        reset_mfa(args.username)
    elif args.command == "change-password":
        change_password(args.username, args.password)


if __name__ == "__main__":
    main()
