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
        SELECT id, name, email, password_hash, role, created_at,
               COALESCE(department, '') AS department,
               COALESCE(institution, '') AS institution,
               COALESCE(phone, '') AS phone,
               COALESCE(preferences, '{}') AS preferences
        FROM users
        WHERE email = ?
        """,
        (email,)
    )

    return cursor.fetchone()


def get_user_by_id(connection, user_id):
    """
    Find a user using their ID.
    """

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT id, name, email, password_hash, role, created_at,
               COALESCE(department, '') AS department,
               COALESCE(institution, '') AS institution,
               COALESCE(phone, '') AS phone,
               COALESCE(preferences, '{}') AS preferences
        FROM users
        WHERE id = ?
        """,
        (user_id,)
    )

    return cursor.fetchone()


def update_user_profile(connection, user_id, name, department="", institution="", phone=""):
    """
    Update profile details for a user.
    """

    cursor = connection.cursor()

    cursor.execute(
        """
        UPDATE users
        SET name = ?,
            department = ?,
            institution = ?,
            phone = ?
        WHERE id = ?
        """,
        (name, department, institution, phone, user_id)
    )

    connection.commit()
    return cursor.rowcount


def update_user_password(connection, user_id, new_password_hash):
    """
    Update password hash for a user.
    """

    cursor = connection.cursor()

    cursor.execute(
        """
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
        """,
        (new_password_hash, user_id)
    )

    connection.commit()
    return cursor.rowcount


def update_user_preferences(connection, user_id, preferences_json):
    """
    Update preferences JSON string for a user.
    """

    cursor = connection.cursor()

    cursor.execute(
        """
        UPDATE users
        SET preferences = ?
        WHERE id = ?
        """,
        (preferences_json, user_id)
    )

    connection.commit()
    return cursor.rowcount


def verify_password(password, password_hash):
    """
    Check whether the entered password matches
    the stored password hash.
    """

    return check_password_hash(password_hash, password)