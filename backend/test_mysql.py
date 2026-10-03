import pymysql

passwords = ["", "root", "password", "admin", "123456", "mysql"]

success_pwd = None
for p in passwords:
    try:
        conn = pymysql.connect(host='localhost', user='root', password=p)
        print(f"SUCCESS with password: '{p}'")
        success_pwd = p
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS sla_monitoring;")
        conn.commit()
        conn.close()
        break
    except Exception as e:
        print(f"Failed with password '{p}': {e}")

