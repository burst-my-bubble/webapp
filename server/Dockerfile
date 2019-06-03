FROM python:3.7-stretch
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
COPY . .
ENV DATABASE_URI database
ENV SENTRY_URI "https://50dbf00c1d4f4a09b86e1588fafdf23b@sentry.io/1473610"
ENV PORT 8000
CMD python server.py