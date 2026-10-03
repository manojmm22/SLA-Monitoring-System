import sqlite3
import bcrypt

conn = sqlite3.connect('instance/sla_monitoring.db')
cursor = conn.cursor()
cursor.execute('SELECT username, password_hash FROM users')
rows = cursor.fetchall()
for username, phash in rows:
    print(f"User: {username}, Hash: {phash}")
    if username == 'admin':
        is_valid = bcrypt.checkpw(b'Admin@123', phash.encode('utf-8'))
        print(f"Is Admin@123 valid for admin? {is_valid}")
