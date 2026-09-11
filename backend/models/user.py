from werkzeug.security import generate_password_hash, check_password_hash


def create_user(connection, name, email, password, role):
    """
    Create a new user with a securely hashed password.
    """

    password_hash = generate_password_hash(password)

    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
        """,
        (name, email, password_hash, role)
    )

    connection.commit()

    return cursor.lastrowid


def get_user_by_email(connection, email):
    """
    Find a user using their email address.
    """

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, name, email, password_hash, role, created_at
        FROM users
        WHERE email = ?
        """,
        (email,)
    )

    return cursor.fetchone()


def verify_password(password, password_hash):
    """
    Check whether the entered password matches
    the stored password hash.
    """

    return check_password_hash(password_hash, password)