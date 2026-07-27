import openpyxl
from openpyxl.styles import Font, PatternFill


import io
import urllib.parse


def create_codebook_xlsx(project, project_codes, segments):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Interview Statistics"

    # define and style the header row 
    headers = ["Document Name", "Code Name", "Parent Code", "The Text Segment", "Timestamp"]
    ws.append(headers)

    header_fill = PatternFill(start_color="333333", end_color="333333", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font

    code_dict = {c.id: c for c in project_codes}

    for seg in segments:
            doc_name = seg.document.filename if seg.document else "Unknown"

            # Resolve Code and Parent Code
            code = code_dict.get(seg.code_id)
            code_name = code.name if code else "Unknown"

            parent_code_name = "N/A"
            if code and code.parent_id:
                parent = code_dict.get(code.parent_id)
                parent_code_name = parent.name if parent else "N/A"

            text_segment = seg.content

            timestamp = getattr(seg, 'created_at', getattr(seg.document, 'created_at', "N/A"))
            if timestamp != "N/A" and hasattr(timestamp, "strftime"):
                timestamp = timestamp.strftime("%Y-%m-%d %H:%M")

            ws.append([doc_name, code_name, parent_code_name, text_segment, timestamp])

    # Auto-adjust column widths for readability
    ws.column_dimensions['A'].width = 25 # Document Name
    ws.column_dimensions['B'].width = 20 # Code Name
    ws.column_dimensions['C'].width = 20 # Parent Code
    ws.column_dimensions['D'].width = 60 # Text Segment (Wider)
    ws.column_dimensions['E'].width = 18 # Timestamp

    ws.freeze_panes = "A2"

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    safe_filename = urllib.parse.quote(f"{project.name}_Statistics.xlsx")
    return output,safe_filename