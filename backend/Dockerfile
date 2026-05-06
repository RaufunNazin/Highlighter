FROM python:3.11

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN pip install --upgrade pip
COPY requirements.txt /app/requirements.txt
RUN pip install -r requirements.txt
COPY . .

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]