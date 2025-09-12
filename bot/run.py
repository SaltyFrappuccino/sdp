import subprocess
import time
import sys
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import logging

# Настройка логирования для лаунчера
logging.basicConfig(level=logging.INFO, format='%(asctime)s - LAUNCHER - %(levelname)s - %(message)s')

class ChangeHandler(FileSystemEventHandler):
    """Обработчик событий изменения в файловой системе."""
    def __init__(self, launcher):
        self.launcher = launcher

    def on_modified(self, event):
        # Реагируем только на изменения в .py файлах
        if event.src_path.endswith('.py'):
            logging.info(f"Обнаружено изменение в файле: {event.src_path}. Перезапускаю бота...")
            self.launcher.restart_bot()

class BotLauncher:
    """Класс для запуска и управления процессом бота."""
    def __init__(self):
        self.process = None

    def start_bot(self):
        """Запускает процесс бота."""
        if self.process and self.process.poll() is None:
            logging.warning("Процесс бота уже запущен. Пропускаю запуск.")
            return
        
        # Используем sys.executable, чтобы гарантировать запуск из того же venv
        command = [sys.executable, 'main.py']
        self.process = subprocess.Popen(command)
        logging.info(f"Бот запущен с PID: {self.process.pid}")

    def stop_bot(self):
        """Останавливает процесс бота."""
        if self.process:
            logging.info(f"Останавливаю процесс бота с PID: {self.process.pid}")
            self.process.terminate()
            try:
                # Ждем завершения процесса с таймаутом
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logging.warning(f"Процесс {self.process.pid} не завершился вовремя, убиваю принудительно.")
                self.process.kill()
            self.process = None

    def restart_bot(self):
        """Перезапускает бота."""
        self.stop_bot()
        self.start_bot()

def main():
    path = '.' # Отслеживаем текущую директорию (папку 'bot')
    
    launcher = BotLauncher()
    launcher.start_bot()

    event_handler = ChangeHandler(launcher)
    observer = Observer()
    observer.schedule(event_handler, path, recursive=True)
    observer.start()
    logging.info(f"Наблюдатель запущен для директории: {path}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logging.info("Получен сигнал KeyboardInterrupt. Завершаю работу...")
        observer.stop()
        launcher.stop_bot()
    
    observer.join()
    logging.info("Наблюдатель остановлен. Выход.")

if __name__ == "__main__":
    main()
