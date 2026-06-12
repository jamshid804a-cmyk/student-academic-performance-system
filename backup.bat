@echo off
set BACKUP_DIR=C:\my-project\backups
set DATE=%date:~10,4%-%date:~4,2%-%date:~7,2%
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
"C:\Program Files\MySQL\MySQL Server 9.7\bin\mysqldump.exe" -u root -p536232zohan my_project_db > "%BACKUP_DIR%\backup_%DATE%.sql"
echo Backup saved to %BACKUP_DIR%\backup_%DATE%.sql
pause