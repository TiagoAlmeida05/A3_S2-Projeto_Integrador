import io
import uuid
import xml.etree.ElementTree as ET
import zipfile

from fastapi import HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

import models


def generate_guid(prefix: str, item_id: int) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"jupiter.qda.{prefix}.{item_id}"))


def export_refi_xml(project_id: int, db: Session) -> Response:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ET.register_namespace("", "urn:QDA-XML:project:1.0")

    master_user_guid = str(uuid.uuid4())

    root = ET.Element("{urn:QDA-XML:project:1.0}Project", attrib={
        "name": project.name,
        "origin": "jUPiter QDA",
        "creatingUserGUID": master_user_guid,
    })

    users = ET.SubElement(root, "{urn:QDA-XML:project:1.0}Users")
    ET.SubElement(users, "{urn:QDA-XML:project:1.0}User", attrib={
        "guid": master_user_guid,
        "name": "jUPiter User",
    })

    codes = db.query(models.Code).filter(models.Code.project_id == project_id).all()
    docs = db.query(models.Document).filter(models.Document.project_id == project_id).all()
    doc_segments = db.query(models.Segment).join(models.Document).filter(models.Document.project_id == project_id).all()

    code_ids = [c.id for c in codes]
    segment_ids = [s.id for s in doc_segments]

    project_memos = db.query(models.Memo).filter(
        models.Memo.target_type == "project",
        models.Memo.target_id == project_id,
    ).all()
    code_memos = db.query(models.Memo).filter(
        models.Memo.target_type == "code",
        models.Memo.target_id.in_(code_ids),
    ).all() if code_ids else []
    segment_memos = db.query(models.Memo).filter(
        models.Memo.target_type == "segment",
        models.Memo.target_id.in_(segment_ids),
    ).all() if segment_ids else []

    memos_by_code = {}
    for memo in code_memos:
        memos_by_code.setdefault(memo.target_id, []).append(memo)

    memos_by_segment = {}
    for memo in segment_memos:
        memos_by_segment.setdefault(memo.target_id, []).append(memo)

    all_memos = project_memos + code_memos + segment_memos

    codebook = ET.SubElement(root, "{urn:QDA-XML:project:1.0}CodeBook")
    codes_elem = ET.SubElement(codebook, "{urn:QDA-XML:project:1.0}Codes")

    code_guid_map = {}
    for code in codes:
        code_guid = generate_guid("code", code.id)
        code_guid_map[code.id] = code_guid
        code_attribs = {"guid": code_guid, "name": code.name, "isCodable": "true"}
        if code.color:
            code_attribs["color"] = code.color

        code_elem = ET.SubElement(codes_elem, "{urn:QDA-XML:project:1.0}Code", attrib=code_attribs)
        if code.description:
            code_desc = ET.SubElement(code_elem, "{urn:QDA-XML:project:1.0}Description")
            code_desc.text = code.description

        if code.id in memos_by_code:
            for memo in memos_by_code[code.id]:
                ET.SubElement(code_elem, "{urn:QDA-XML:project:1.0}NoteRef", attrib={
                    "targetGUID": generate_guid("memo", memo.id),
                })

    zip_files_to_write = {}

    sources = ET.SubElement(root, "{urn:QDA-XML:project:1.0}Sources")

    for document in docs:
        doc_guid = generate_guid("doc", document.id)
        internal_filename = f"{doc_guid}.txt"

        source_elem = ET.SubElement(sources, "{urn:QDA-XML:project:1.0}TextSource", attrib={
            "guid": doc_guid,
            "name": document.filename,
            "plainTextPath": f"internal://{internal_filename}",
            "creatingUser": master_user_guid,
        })

        zip_files_to_write[f"Sources/{internal_filename}"] = document.content

        document_segments = db.query(models.Segment).filter(models.Segment.document_id == document.id).all()
        for segment in document_segments:
            selection_guid = generate_guid("selection", segment.id)

            selection_elem = ET.SubElement(source_elem, "{urn:QDA-XML:project:1.0}PlainTextSelection", attrib={
                "guid": selection_guid,
                "name": f"Selection-{segment.id}",
                "startPosition": str(segment.start_char),
                "endPosition": str(segment.end_char),
                "creatingUser": master_user_guid,
            })

            coding_elem = ET.SubElement(selection_elem, "{urn:QDA-XML:project:1.0}Coding", attrib={
                "guid": generate_guid("coding", segment.id),
                "creatingUser": master_user_guid,
            })

            ET.SubElement(coding_elem, "{urn:QDA-XML:project:1.0}CodeRef", attrib={
                "targetGUID": code_guid_map[segment.code_id],
            })

    if all_memos:
        notes_elem = ET.SubElement(root, "{urn:QDA-XML:project:1.0}Notes")
        for memo in all_memos:
            memo_guid = generate_guid("memo", memo.id)
            preview_text = (memo.text[:47] + "...") if len(memo.text) > 50 else memo.text
            preview_text = preview_text.replace("\n", " ")

            note_elem = ET.SubElement(notes_elem, "{urn:QDA-XML:project:1.0}Note", attrib={
                "guid": memo_guid,
                "name": preview_text,
                "creatingUser": master_user_guid,
            })
            content_elem = ET.SubElement(note_elem, "{urn:QDA-XML:project:1.0}PlainTextContent")
            content_elem.text = memo.text

    if project.description:
        desc = ET.SubElement(root, "{urn:QDA-XML:project:1.0}Description")
        desc.text = project.description

    xml_str = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    safe_filename = project.name.replace(" ", "_")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("project.qde", xml_str)
        for filepath, content in zip_files_to_write.items():
            zip_file.writestr(filepath, content.encode("utf-8"))

    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}.qdpx"'},
    )


async def import_refi_xml(file: UploadFile, db: Session):
    if not file.filename.endswith(".qdpx"):
        raise HTTPException(status_code=400, detail="File must be a .qdpx package")

    try:
        content = await file.read()
        zip_ref = zipfile.ZipFile(io.BytesIO(content))

        xml_data = zip_ref.read("project.qde")
        root = ET.fromstring(xml_data)

        for elem in root.iter():
            if "}" in elem.tag:
                elem.tag = elem.tag.split("}", 1)[1]

        base_name = root.attrib.get("name", "Imported Project")
        proj_name = base_name

        counter = 1
        while db.query(models.Project).filter(models.Project.name == proj_name).first() is not None:
            proj_name = f"{base_name} ({counter})"
            counter += 1

        desc_elem = root.find("Description")
        proj_desc = desc_elem.text if desc_elem is not None else None

        new_project = models.Project(name=proj_name, description=proj_desc)
        db.add(new_project)
        db.commit()
        db.refresh(new_project)

        guid_to_code_id = {}

        for code_elem in root.findall(".//Code"):
            guid = code_elem.attrib.get("guid")
            name = code_elem.attrib.get("name")
            color = code_elem.attrib.get("color", "#646cff")

            c_desc_elem = code_elem.find("Description")
            description = c_desc_elem.text if c_desc_elem is not None else None

            new_code = models.Code(
                project_id=new_project.id,
                name=name,
                color=color,
                description=description,
            )
            db.add(new_code)
            db.commit()
            db.refresh(new_code)

            guid_to_code_id[guid] = new_code.id

        for source_elem in root.findall(".//TextSource"):
            doc_name = source_elem.attrib.get("name")

            doc_content = ""
            plain_text_path = source_elem.attrib.get("plainTextPath")

            if plain_text_path and plain_text_path.startswith("internal://"):
                raw_filename = plain_text_path.split("/")[-1]
                zip_path = None
                for name in zip_ref.namelist():
                    if name.endswith(raw_filename):
                        zip_path = name
                        break

                if zip_path:
                    try:
                        raw_bytes = zip_ref.read(zip_path)
                        try:
                            doc_content = raw_bytes.decode("utf-8-sig")
                        except UnicodeDecodeError:
                            doc_content = raw_bytes.decode("utf-8", errors="ignore")
                    except Exception as exc:
                        print(f"Failed to read file {zip_path} from ZIP: {exc}")
            else:
                pt_elem = source_elem.find("PlainTextContent")
                if pt_elem is not None and pt_elem.text:
                    doc_content = pt_elem.text

            new_doc = models.Document(
                project_id=new_project.id,
                filename=doc_name,
                content=doc_content,
                type="txt",
            )
            db.add(new_doc)
            db.commit()
            db.refresh(new_doc)

            for sel_elem in source_elem.findall(".//PlainTextSelection"):
                start_pos = int(sel_elem.attrib.get("startPosition", 0))
                end_pos = int(sel_elem.attrib.get("endPosition", 0))

                for coding_elem in sel_elem.findall(".//Coding"):
                    code_ref = coding_elem.find("CodeRef")
                    if code_ref is not None:
                        target_guid = code_ref.attrib.get("targetGUID")
                        actual_code_id = guid_to_code_id.get(target_guid)

                        if actual_code_id:
                            segment_text = doc_content[start_pos:end_pos]
                            new_segment = models.Segment(
                                document_id=new_doc.id,
                                code_id=actual_code_id,
                                start_char=start_pos,
                                end_char=end_pos,
                                content=segment_text,
                            )
                            db.add(new_segment)

        db.commit()
        return new_project
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid QDPX package (Not a valid ZIP file)")
    except Exception as exc:
        db.rollback()
        print(f"Import Error: {str(exc)}")
        raise HTTPException(status_code=500, detail=f"Failed to process QDPX: {str(exc)}")