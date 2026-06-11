"""
AgriVision AI — Report Generation Service
============================================
Generate PDF health reports and QR codes.
"""

import io
import base64
from datetime import datetime
from typing import Dict
from pathlib import Path

from app.config import settings


def generate_pdf_report(prediction_data: Dict) -> bytes:
    """Generate a PDF health report for a prediction."""
    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Title
    pdf.set_font("Arial", "B", 20)
    pdf.cell(0, 15, "AgriVision AI - Crop Health Report", ln=True, align="C")
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 8, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", ln=True, align="C")
    pdf.ln(10)

    # Disease Info
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "Diagnosis", ln=True)
    pdf.set_font("Arial", "", 11)
    pdf.cell(60, 8, "Disease:", 0)
    pdf.cell(0, 8, prediction_data.get("disease", "Unknown"), ln=True)
    pdf.cell(60, 8, "Confidence:", 0)
    pdf.cell(0, 8, f"{prediction_data.get('confidence', 0):.1%}", ln=True)
    pdf.cell(60, 8, "Severity:", 0)
    pdf.cell(0, 8, prediction_data.get("severity", "N/A"), ln=True)
    pdf.cell(60, 8, "Crop:", 0)
    pdf.cell(0, 8, prediction_data.get("crop", "N/A"), ln=True)
    pdf.ln(8)

    # Treatments
    treatments = prediction_data.get("chemical_treatments", [])
    if treatments:
        pdf.set_font("Arial", "B", 14)
        pdf.cell(0, 10, "Chemical Treatments", ln=True)
        pdf.set_font("Arial", "", 10)
        for t in treatments:
            name = t.get("name", "") if isinstance(t, dict) else str(t)
            dosage = t.get("dosage", "") if isinstance(t, dict) else ""
            pdf.cell(0, 7, f"- {name}: {dosage}", ln=True)
        pdf.ln(5)

    # Organic Remedies
    remedies = prediction_data.get("organic_remedies", [])
    if remedies:
        pdf.set_font("Arial", "B", 14)
        pdf.cell(0, 10, "Organic Remedies", ln=True)
        pdf.set_font("Arial", "", 10)
        for r in remedies:
            name = r.get("name", "") if isinstance(r, dict) else str(r)
            pdf.cell(0, 7, f"- {name}", ln=True)
        pdf.ln(5)

    # Preventive
    preventive = prediction_data.get("preventive_measures", [])
    if preventive:
        pdf.set_font("Arial", "B", 14)
        pdf.cell(0, 10, "Preventive Measures", ln=True)
        pdf.set_font("Arial", "", 10)
        for p in preventive:
            pdf.cell(0, 7, f"- {p}", ln=True)

    return pdf.output()


def generate_qr_code(data: str) -> str:
    """Generate QR code as base64 PNG."""
    try:
        import qrcode
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{b64}"
    except ImportError:
        return ""
