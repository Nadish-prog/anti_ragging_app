const prisma = require("../utils/prismaClient");
const supabase = require("../utils/supabaseClient");
exports.createComplaint = async (req, res) => {
  try {
    const {
      title,
      description,
      severity_id,
      location,
      incident_date,
      accused,
      is_anonymous,
    } = req.body;

    //  validation
    if (!title || !description || !severity_id) {
      return res.status(400).json({
        message: "Title, description and severity are required",
      });
    }

    const OPEN_STATUS_ID = 1; // assuming OPEN = 1

    const result = await prisma.$transaction(async (tx) => {
      // Create complaint
      const complaint = await tx.complaints.create({
        data: {
          title,
          description,
          severity_id,
          location: location || null,
          incident_date: incident_date ? new Date(incident_date) : null,
          student_id: req.user.user_id,
          status_id: OPEN_STATUS_ID,
          is_anonymous: is_anonymous || false,
        },
      });

      // Insert accused (if provided)
      if (Array.isArray(accused) && accused.length > 0) {
        for (const person of accused) {
          // Ensure identity exists
          if (!person.user_id && !person.accused_name) {
            throw new Error("Each accused must have user_id or accused_name");
          }

          // Prevent student accusing themselves
          if (person.user_id && person.user_id === req.user.user_id) {
            throw new Error("You cannot accuse yourself");
          }

          await tx.complaint_accused.create({
            data: {
              complaint_id: complaint.complaint_id,
              user_id: person.user_id || null,
              accused_name: person.accused_name || null,
              department_id: person.department_id || null,
            },
          });
        }
      }

      //  Create audit log
      await tx.complaint_logs.create({
        data: {
          complaint_id: complaint.complaint_id,
          action_by_user_id: req.user.user_id,
          action_description: is_anonymous
            ? "Anonymous complaint created"
            : "Complaint created",
        },
      });

      return complaint;
    });

    return res.status(201).json({
      message: "Complaint created successfully",
      complaint: result,
    });
  } catch (error) {
    console.error("Create Complaint Error:", error);
    return res.status(500).json({
      message: error.message || "Server error",
    });
  }
};

exports.uploadEvidence = async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }

    // Check complaint ownership
    const complaint = await prisma.complaints.findUnique({
      where: { complaint_id: complaintId },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.student_id !== req.user.user_id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const fileName = `complaint-${complaintId}-${Date.now()}`;

    const { data, error } = await supabase.storage
      .from("complaint-evidence")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/complaint-evidence/${fileName}`;

    await prisma.evidence.create({
      data: {
        complaint_id: complaintId,
        file_url: publicUrl,
        file_type: file.mimetype,
      },
    });

    res.status(201).json({
      message: "Evidence uploaded successfully",
      file_url: publicUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.assignFaculty = async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    const { faculty_id } = req.body;

    if (!faculty_id) {
      return res.status(400).json({ message: "Faculty ID required" });
    }

    // Check complaint exists
    const complaint = await prisma.complaints.findUnique({
      where: { complaint_id: complaintId },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Check faculty exists and role = FACULTY
    const faculty = await prisma.users.findUnique({
      where: { user_id: faculty_id },
      include: { roles: true },
    });

    if (!faculty || faculty.roles.role_name !== "FACULTY") {
      return res.status(400).json({ message: "Invalid faculty user" });
    }

    // Get UNDER_REVIEW status ID dynamically
    const status = await prisma.complaint_status.findFirst({
      where: { status_name: "UNDER_REVIEW" },
    });

    if (!status) {
      return res.status(500).json({ message: "Status not configured" });
    }

    // Update complaint
    const updatedComplaint = await prisma.complaints.update({
      where: { complaint_id: complaintId },
      data: {
        assigned_faculty_id: faculty_id,
        status_id: status.status_id,
        updated_at: new Date(),
      },
    });

    // Create log
    await prisma.complaint_logs.create({
      data: {
        complaint_id: complaintId,
        action_by_user_id: req.user.user_id,
        action_description: `Assigned to faculty ID ${faculty_id}`,
      },
    });

    res.status(200).json({
      message: "Faculty assigned successfully",
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAssignedComplaints = async (req, res) => {
  try {
    const complaints = await prisma.complaints.findMany({
      where: {
        assigned_faculty_id: req.user.user_id,
      },
      include: {
        // Correct relation name for student details
        users_complaints_student_idTousers: {
          select: {
            full_name: true,
            roll_no: true,
            phone_no: true,
            year: true,
            department_id: true,
          },
        },
        // Include accused details including their user profile if available
        complaint_accused: {
          include: {
            users: {
              select: {
                full_name: true,
                roll_no: true,
                department_id: true,
              },
            },
            departments: true,
          },
        },
        evidence: true,
        complaint_status: true,
        severity_levels: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const formatted = complaints.map((c) => {
      // Logic to resolve accused name: preferably from linked user, else from static name
      const formattedAccused = c.complaint_accused.map((acc) => ({
        accused_id: acc.accused_id,
        name: acc.users ? acc.users.full_name : acc.accused_name,
        roll_no: acc.users ? acc.users.roll_no : null,
        department: acc.departments ? acc.departments.department_name : null,
        user_id: acc.user_id,
      }));

      return {
        complaint_id: c.complaint_id,
        title: c.title,
        description: c.description,
        location: c.location,
        incident_date: c.incident_date,
        status: c.complaint_status?.status_name,
        severity: c.severity_levels?.level_name,
        is_anonymous: c.is_anonymous,
        final_remark: c.final_remark,
        created_at: c.created_at,

        // Hide student details if anonymous
        student_info: c.is_anonymous
          ? null
          : {
              full_name: c.users_complaints_student_idTousers?.full_name,
              roll_no: c.users_complaints_student_idTousers?.roll_no,
              year: c.users_complaints_student_idTousers?.year,
              department_id: c.users_complaints_student_idTousers?.department_id,
              phone_no: c.users_complaints_student_idTousers?.phone_no,
            },

        accused: formattedAccused,
        evidence: c.evidence,
      };
    });

    res.status(200).json({ complaints: formatted });
  } catch (error) {
    console.error("Fetch Assigned Complaints Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
