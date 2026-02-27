from flask import Flask, request, jsonify, render_template, redirect, url_for, session, send_from_directory, Response
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from werkzeug.security import generate_password_hash, check_password_hash
from flask_talisman import Talisman
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import bleach
from datetime import datetime
import os
import csv
import io
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-dev-key-do-not-use-in-production')

# --- Security Headers (Talisman) ---
# Allow inline scripts and styles for the frontend templates
csp = {
    'default-src': [
        '\'self\'',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
    ],
    'script-src': ['\'self\'', '\'unsafe-inline\''],
    'style-src': ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
    'img-src': ['\'self\'', 'data:'],
    'media-src': ['\'self\'']
}
Talisman(app, content_security_policy=csp)

# --- Rate Limiting (Limiter) ---
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# --- MongoDB Initialization ---
uri = os.environ.get("MONGO_URI", "mongodb+srv://vip25admin:vip%40admin25@cluster0.yq8umxa.mongodb.net/?appName=Cluster0")

client = None
db = None
try:
    client = MongoClient(
        uri,
        server_api=ServerApi('1'),
        serverSelectionTimeoutMS=5000,
        tls=True,
        tlsAllowInvalidCertificates=True  # Fixes SSL handshake error on Windows Python 3.11
    )
    db = client.vip25
    print("MongoDB client initialized.")
except Exception as e:
    print(f"Warning: MongoDB initialization failed. Error: {e}")

# Admin credentials are loaded dynamically in the login route from .env


# Helper to sanitize inputs
def sanitize(text):
    if not isinstance(text, str):
        return text
    return bleach.clean(text.strip())

# --- Routes for Pages ---

@app.route('/')
@app.route('/home')
@app.route('/about')
@app.route('/services')
@app.route('/why')
@app.route('/how')
@app.route('/contact-form')
def home():
    return render_template('index.html')

@app.route('/career')
def career():
    return render_template('career.html')


# --- API Endpoints ---

@app.route('/api/client', methods=['POST'])
@limiter.limit("5 per minute") # Rate limiting on form submission
def api_client():
    data = request.json
    try:
        if db is None:
            raise Exception("Database connection not configured.")
        payload = {
            "name": sanitize(data.get('name')),
            "email": sanitize(data.get('email')),
            "phone": sanitize(data.get('phone')),
            "service": sanitize(data.get('service')),
            "message": sanitize(data.get('message')),
            "submitted_at": datetime.utcnow()
        }
        db.client_forms.insert_one(payload)
        return jsonify({"message": "Form submitted successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/career', methods=['POST'])
@limiter.limit("5 per minute") # Rate limiting on form submission
def api_career():
    data = request.json
    try:
        if db is None:
            raise Exception("Database connection not configured.")
        payload = {
            "fullname": sanitize(data.get('fullname')),
            "email": sanitize(data.get('email')),
            "phone": sanitize(data.get('phone')),
            "experience": sanitize(data.get('experience')),
            "skills": sanitize(data.get('skills')),
            "portfolio": sanitize(data.get('portfolio')),
            "linkedin": sanitize(data.get('linkedin')),
            "github": sanitize(data.get('github')),
            "project1": sanitize(data.get('project1')),
            "project2": sanitize(data.get('project2')),
            "project3": sanitize(data.get('project3')),
            "message": sanitize(data.get('message')),
            "availability": sanitize(data.get('availability')),
            "submitted_at": datetime.utcnow()
        }
        db.career_forms.insert_one(payload)
        return jsonify({"message": "Application submitted successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# --- Admin Dashboard ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Read credentials fresh from env on every login attempt
        admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
        admin_hash = os.environ.get('ADMIN_PASSWORD_HASH', generate_password_hash('admin123'))

        if username == admin_username and check_password_hash(admin_hash, password):
            session['admin_logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        else:
            return render_template('login.html', error='Invalid credentials')
            
    return render_template('login.html', error=None)

@app.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('login'))

@app.route('/admin')
def admin_dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('login'))
        
    client_forms = []
    career_forms = []
    
    if db is not None:
        try:
            client_forms = list(db.client_forms.find().sort("submitted_at", -1))
            career_forms = list(db.career_forms.find().sort("submitted_at", -1))
        except Exception as e:
            print(f"Error fetching from MongoDB: {e}")

    # Format dates
    for f in client_forms:
        f['formatted_date'] = f.get('submitted_at').strftime('%Y-%m-%d %H:%M') if f.get('submitted_at') else 'N/A'
    for f in career_forms:
        f['formatted_date'] = f.get('submitted_at').strftime('%Y-%m-%d %H:%M') if f.get('submitted_at') else 'N/A'
    
    return render_template('admin.html', client_forms=client_forms, career_forms=career_forms)


# --- CSV Export Endpoints ---

@app.route('/admin/export/clients')
@limiter.limit("10 per minute")
def export_clients():
    if not session.get('admin_logged_in'):
        return redirect(url_for('login'))
    
    forms = list(db.client_forms.find().sort('submitted_at', -1)) if db is not None else []
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Name', 'Email', 'Phone', 'Service', 'Message'])
    for f in forms:
        date_str = f.get('submitted_at').strftime('%Y-%m-%d %H:%M') if f.get('submitted_at') else 'N/A'
        writer.writerow([date_str, f.get('name'), f.get('email'), f.get('phone'), f.get('service'), f.get('message')])
    
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=client_forms.csv'}
    )

@app.route('/admin/export/careers')
@limiter.limit("10 per minute")
def export_careers():
    if not session.get('admin_logged_in'):
        return redirect(url_for('login'))
    
    forms = list(db.career_forms.find().sort('submitted_at', -1)) if db is not None else []
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Full Name', 'Email', 'Phone', 'Experience', 'Skills', 'Portfolio', 'LinkedIn', 'GitHub', 'Project1', 'Project2', 'Project3', 'Message', 'Availability'])
    for f in forms:
        date_str = f.get('submitted_at').strftime('%Y-%m-%d %H:%M') if f.get('submitted_at') else 'N/A'
        writer.writerow([
            date_str, f.get('fullname'), f.get('email'), f.get('phone'),
            f.get('experience'), f.get('skills'), f.get('portfolio'),
            f.get('linkedin'), f.get('github'),
            f.get('project1'), f.get('project2'), f.get('project3'),
            f.get('message'), f.get('availability')
        ])
    
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=career_forms.csv'}
    )


if __name__ == '__main__':
    app.run(debug=True, port=3000)
