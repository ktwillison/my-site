# Set Python version
FROM python:2.7.18

# Install dependencies
RUN pip install gunicorn
RUN pip install Flask==0.10.1
RUN pip install Flask-Cors==2.1.2
RUN pip install flask-restful==0.3.5
RUN pip install Flask-Assets==0.11
RUN pip install requests==2.5.0
RUN pip install numpy==1.9.2
RUN pip install scipy==0.15.1
RUN pip install scikit-learn==0.15.2
RUN pip install nltk==3.4.5
RUN pip install futures==3.4.0

# Copy the server’s source files into a folder within the container named app. 
# Then set the working directory to that app folder.
COPY src/ /app
WORKDIR /app

# Cloud Run expects the port to be 8080.
ENV PORT 8080

# Run gunicorn bound to the 8080 port.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 flask_front_end_app:app