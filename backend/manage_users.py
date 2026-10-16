#!/usr/bin/env python3
"""
CLI de Gestión de Usuarios para Dalton AEC IVRS.
Permite administrar usuarios directamente desde el servidor AWS sin necesidad
de manipular hashes de contraseña manualmente en SQLite.

Uso:
  python manage_users.py list
  python manage_users.py create --username admin --password MiPasswordSeguro123!
  python manage_users.py reset-mfa --username admin
  python manage_users.py change-password --username admin --password NuevoPassword123!
"""

import argparse
import sys
from database import SessionLocal, engine, Base
import models
import auth

# Asegurar tablas creadas
Base.metadata.create_all(bind=engine)


def list_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        if not users:
            print("No hay usuarios registrados en la base de datos.")
            return

        print(f"\n{'ID':<5} {'Usuario':<25} {'MFA Activo':<12} {'Activo':<8}")
        print("-" * 55)
        for u in users:
            mfa_status = "Sí" if u.is_mfa_enabled else "Pendiente"
            active_status = "Sí" if u.is_active else "No"
            print(f"{u.id:<5} {u.username:<25} {mfa_status:<12} {active_status:<8}")
        print()
    finally:
        db.close()


def create_user(username: str, password: str):
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.username == username.strip()).first()
        if existing:
            print(f"Error: El usuario '{username}' ya existe.")
            sys.exit(1)

        hashed = auth.hash_password(password)
        new_user = models.User(
            username=username.strip(),
            hashed_password=hashed,
            is_mfa_enabled=False,
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        print(f"Usuario '{username}' creado exitosamente.")
        print("En su primer inicio de sesión se le solicitará escanear el código QR para configurar MFA.")
    finally:
        db.close()


def reset_mfa(username: str):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == username.strip()).first()
        if not user:
            print(f"Error: Usuario '{username}' no encontrado.")
            sys.exit(1)

        user.is_mfa_enabled = False
        user.totp_secret = None
        db.commit()
        print(f"MFA reseteado para el usuario '{username}'.")
        print("En su próximo inicio de sesión verá un nuevo código QR para vincular su aplicación Authenticator.")
    finally:
        db.close()


def change_password(username: str, new_password: str):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == username.strip()).first()
        if not user:
            print(f"Error: Usuario '{username}' no encontrado.")
            sys.exit(1)

        user.hashed_password = auth.hash_password(new_password)
        db.commit()
        print(f"Contraseña actualizada exitosamente para el usuario '{username}'.")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Administración de usuarios de AEC IVRS")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcomando list
    subparsers.add_parser("list", help="Listar todos los usuarios y su estado MFA")

    # Subcomando create
    create_p = subparsers.add_parser("create", help="Crear un nuevo usuario")
    create_p.add_argument("--username", required=True, help="Nombre de usuario o correo")
    create_p.add_argument("--password", required=True, help="Contraseña inicial")

    # Subcomando reset-mfa
    reset_p = subparsers.add_parser("reset-mfa", help="Resetear MFA de un usuario (para re-escanear QR)")
    reset_p.add_argument("--username", required=True, help="Nombre de usuario")

    # Subcomando change-password
    pwd_p = subparsers.add_parser("change-password", help="Cambiar contraseña de un usuario")
    pwd_p.add_argument("--username", required=True, help="Nombre de usuario")
    pwd_p.add_argument("--password", required=True, help="Nueva contraseña")

    args = parser.parse_args()

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
