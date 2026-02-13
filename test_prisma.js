const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database...");
    
    // Find a faculty user to test with
    const faculty = await prisma.users.findFirst({
      where: {
        roles: {
          role_name: 'FACULTY'
        }
      }
    });

    if (!faculty) {
      console.log("No faculty user found. Finding ANY assigned complaint to check relations.");
    } else {
        console.log(`Found faculty: ${faculty.full_name} (ID: ${faculty.user_id})`);
    }


    // Clean test of enhanced logic
    console.log("------------------------------------------------");

    console.log("------------------------------------------------");

    console.log("Attempting to fetch with enhanced controller logic...");
    try {
        const complaints = await prisma.complaints.findMany({
            take: 1,
            include: {
                users_complaints_student_idTousers: {
                  select: {
                    full_name: true,
                    roll_no: true,
                    phone_no: true,
                    year: true,
                    department_id: true
                  }
                },
                complaint_accused: {
                  include: {
                    users: {
                      select: {
                        full_name: true,
                        roll_no: true,
                        department_id: true
                      }
                    },
                    departments: true
                  }
                },
                evidence: true,
                complaint_status: true,
                severity_levels: true
            }
        });
        console.log("Successfully fetched with ENHANCED logic:");
        console.dir(complaints, { depth: null });
    } catch (e) {
        console.log("Failed to fetch with enhanced logic. Error:");
        console.log(e.message);
    }

  } catch (error) {
    console.error("General Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
