# Set Python version
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install dependencies first, so this layer is cached between source-only changes
COPY src/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy the server’s source files into a folder within the container named src.
# Then set the working directory to that src folder.
COPY src/ /src
WORKDIR /src

# Cloud Run expects the port to be 8080.
ENV PORT=8080

# Run gunicorn (it binds to 0.0.0.0:$PORT automatically when PORT is set).
CMD ["gunicorn", "--workers", "1", "--threads", "8", "flask_front_end_app:app"]
