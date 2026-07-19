import csv
import io
import urllib.parse


def create_codebook_csv(project):
    segments = project.segments

    output = io.StringIO()
    output.write('\ufeff')

    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_ALL)
    writer.writerow(["Document Name", "Code Name", "Quote Content", "Start Pos", "End Pos", "Attached Memos"])

    for seg in segments:
        doc_name = seg.document.filename if seg.document else "Unknown"
        code_name = seg.code.name if seg.code else "Unknown"

        clean_content = seg.content.replace('\r', '').strip() if seg.content else ""

        # Fetch all memos attached specifically to this quote
        memos = seg.memos

        memos_text = "\n---\n".join([m.text.replace('\r', '').strip() for m in memos])

        writer.writerow([doc_name, code_name, clean_content, seg.start_char, seg.end_char, memos_text])

    output.seek(0)

    safe_filename = urllib.parse.quote(f"Quotes_{project.name}.csv")
    return output,safe_filename