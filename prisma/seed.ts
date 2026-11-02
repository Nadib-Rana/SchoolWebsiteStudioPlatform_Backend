import "dotenv/config";
import { PrismaClient, Role, UserStatus, SchoolRole, SchoolPlan, PublishStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgrespassword@localhost:5435/school_studio_db?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log("🌱 Seeding database for School Website Studio Platform...");

  const defaultPassword = await bcrypt.hash("Admin@12345", 10);
  const teacherPassword = await bcrypt.hash("Teacher@12345", 10);

  // 1. Seed Platform Super Admin & School Users
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: {},
    create: {
      email: "superadmin@example.com",
      username: "superadmin",
      password: defaultPassword,
      firstName: "Super",
      lastName: "Admin",
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  const amina = await prisma.user.upsert({
    where: { email: "admin@northfield.edu" },
    update: {},
    create: {
      email: "admin@northfield.edu",
      username: "aminarahman",
      password: defaultPassword,
      firstName: "Amina",
      lastName: "Rahman",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  const mahmud = await prisma.user.upsert({
    where: { email: "mahmud@northfield.edu" },
    update: {},
    create: {
      email: "mahmud@northfield.edu",
      username: "mahmudkarim",
      password: teacherPassword,
      firstName: "Mahmud",
      lastName: "Karim",
      role: Role.USER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  const sara = await prisma.user.upsert({
    where: { email: "sara@northfield.edu" },
    update: {},
    create: {
      email: "sara@northfield.edu",
      username: "sarajahan",
      password: teacherPassword,
      firstName: "Sara",
      lastName: "Jahan",
      role: Role.USER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  const tanvir = await prisma.user.upsert({
    where: { email: "tanvir@northfield.edu" },
    update: {},
    create: {
      email: "tanvir@northfield.edu",
      username: "tanvirnoor",
      password: teacherPassword,
      firstName: "Tanvir",
      lastName: "Noor",
      role: Role.USER,
      status: UserStatus.PENDING_VERIFICATION,
      isEmailVerified: false,
    },
  });

  console.log("✅ Platform and School users created");

  // 2. Seed School Tenant: Northfield High School
  const school = await prisma.school.upsert({
    where: { slug: "northfield-high" },
    update: {
      name: "Northfield High School",
      customDomain: "northfieldhigh.edu",
      plan: SchoolPlan.PROFESSIONAL,
      isPublished: true,
    },
    create: {
      name: "Northfield High School",
      slug: "northfield-high",
      customDomain: "northfieldhigh.edu",
      logoUrl: "/icons/northfield-logo.svg",
      plan: SchoolPlan.PROFESSIONAL,
      isPublished: true,
    },
  });
  console.log(`✅ School tenant created: ${school.name} (ID: ${school.id})`);

  // 3. Seed School Members (Multi-Tenant RBAC)
  await prisma.schoolMember.upsert({
    where: { schoolId_userId: { schoolId: school.id, userId: amina.id } },
    update: { role: SchoolRole.OWNER, isDefault: true },
    create: {
      schoolId: school.id,
      userId: amina.id,
      role: SchoolRole.OWNER,
      isDefault: true,
    },
  });

  await prisma.schoolMember.upsert({
    where: { schoolId_userId: { schoolId: school.id, userId: mahmud.id } },
    update: { role: SchoolRole.EDITOR },
    create: {
      schoolId: school.id,
      userId: mahmud.id,
      role: SchoolRole.EDITOR,
    },
  });

  await prisma.schoolMember.upsert({
    where: { schoolId_userId: { schoolId: school.id, userId: sara.id } },
    update: { role: SchoolRole.CONTENT_MANAGER },
    create: {
      schoolId: school.id,
      userId: sara.id,
      role: SchoolRole.CONTENT_MANAGER,
    },
  });

  await prisma.schoolMember.upsert({
    where: { schoolId_userId: { schoolId: school.id, userId: tanvir.id } },
    update: { role: SchoolRole.ANALYST },
    create: {
      schoolId: school.id,
      userId: tanvir.id,
      role: SchoolRole.ANALYST,
    },
  });

  // 4. Seed School Profile
  await prisma.schoolProfile.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      established: 1984,
      motto: "Excellence in Education, Leadership in Character",
      shortBio:
        "For more than four decades, Northfield High School has combined academic ambition with a culture of care, belonging, and purposeful growth.",
      principalName: "Dr. Farhana Noor",
      principalTitle: "Principal & Head Administrator",
      principalBio:
        "Dr. Farhana Noor brings over 22 years of educational leadership and academic excellence. Prior to joining Northfield, she spearheaded STEM curricular transformation in leading secondary institutions.",
      principalPhotoUrl:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=400",
      visionStatement:
        "To cultivate empathetic, forward-thinking scholars equipped to shape a dynamic global community through academic rigor and ethical leadership.",
      missionStatement:
        "To provide an inclusive, challenging, and nurturing learning environment that empowers students to discover their potential and excel in college, career, and life.",
      address: "142 Northfield Avenue, Riverdale, NY 10471",
      phone: "+1 (555) 234-5678",
      email: "admissions@northfieldhigh.edu",
      officeHours: "Monday - Friday: 8:00 AM - 4:30 PM",
      socialLinks: {
        facebook: "https://facebook.com/northfieldhigh",
        twitter: "https://twitter.com/northfieldhigh",
        youtube: "https://youtube.com/c/northfieldhigh",
        instagram: "https://instagram.com/northfieldhigh",
        linkedin: "https://linkedin.com/school/northfieldhigh",
      },
      stats: {
        studentsCount: 1420,
        facultyCount: 94,
        passRate: "99.4%",
        awardsCount: 36,
      },
      academics: {
        programs: [
          { name: "Primary Years", grades: "Grades 1-5", focus: "Inquiry & Foundational Literacy" },
          { name: "Middle School", grades: "Grades 6-8", focus: "Exploration & STEM Foundations" },
          { name: "Senior High", grades: "Grades 9-12", focus: "College Prep & Advanced Placement" },
        ],
        facilities: [
          "Advanced Science & Robotic Laboratories",
          "Digital Learning Commons & Research Library",
          "Olympic-sized Swimming Pool & Athletic Complex",
          "500-seat Performing Arts Auditorium",
          "Fine Arts & Ceramic Studio",
        ],
      },
    },
  });

  // 5. Seed School Theme Config
  await prisma.schoolThemeConfig.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      activeTheme: "theme-classic",
      selectedTemplate: "tpl-classic",
      primaryColor: "#1E3A8A",
      secondaryColor: "#0D9488",
      accentColor: "#F59E0B",
      fontHeading: "DM Serif Display",
      fontBody: "Inter",
      buttonRadius: "rounded-md",
      buttonShadow: "shadow-sm",
      cardStyle: "bordered",
      headerLayout: "standard",
      footerLayout: "detailed",
    },
  });

  // 6. Seed Pages
  const pagesData = [
    { slug: "home", title: "Home", navLabel: "Home", isHome: true, order: 1, status: PublishStatus.PUBLISHED },
    { slug: "about", title: "About Us", navLabel: "About", isHome: false, order: 2, status: PublishStatus.PUBLISHED },
    { slug: "academics", title: "Academics", navLabel: "Academics", isHome: false, order: 3, status: PublishStatus.PUBLISHED },
    { slug: "admissions", title: "Admissions", navLabel: "Admissions", isHome: false, order: 4, status: PublishStatus.DRAFT },
    { slug: "teachers", title: "Teachers & Faculty", navLabel: "Faculty", isHome: false, order: 5, status: PublishStatus.PUBLISHED },
    { slug: "notices", title: "Notices & Announcements", navLabel: "Notices", isHome: false, order: 6, status: PublishStatus.PUBLISHED },
    { slug: "events", title: "Events & Calendar", navLabel: "Events", isHome: false, order: 7, status: PublishStatus.PUBLISHED },
    { slug: "gallery", title: "Photo & Media Gallery", navLabel: "Gallery", isHome: false, order: 8, status: PublishStatus.PUBLISHED },
    { slug: "contact", title: "Contact Us", navLabel: "Contact", isHome: false, order: 9, status: PublishStatus.PUBLISHED },
  ];

  for (const page of pagesData) {
    const createdPage = await prisma.webPage.upsert({
      where: { schoolId_slug: { schoolId: school.id, slug: page.slug } },
      update: { title: page.title, order: page.order, status: page.status },
      create: {
        schoolId: school.id,
        slug: page.slug,
        title: page.title,
        navLabel: page.navLabel,
        isHome: page.isHome,
        order: page.order,
        status: page.status,
      },
    });

    if (page.isHome) {
      // Seed sections for home page
      const homeSections = [
        { type: "hero", title: "Welcome to Northfield", order: 1 },
        { type: "stats", title: "School by the Numbers", order: 2 },
        { type: "principal", title: "Principal's Welcome", order: 3 },
        { type: "programs", title: "Academic Pathways", order: 4 },
        { type: "faculty", title: "Featured Educators", order: 5 },
        { type: "news", title: "Latest Announcements", order: 6 },
        { type: "events", title: "Upcoming School Events", order: 7 },
        { type: "facilities", title: "Campus Facilities", order: 8 },
        { type: "cta", title: "Admissions Open", order: 9 },
      ];

      for (const sec of homeSections) {
        await prisma.pageSection.create({
          data: {
            pageId: createdPage.id,
            type: sec.type,
            title: sec.title,
            order: sec.order,
            isVisible: true,
          },
        });
      }
    }
  }

  // 7. Seed Teachers
  const teachers = [
    {
      name: "Dr. Farhana Noor",
      designation: "Principal",
      department: "Leadership",
      qualification: "Ph.D. in Educational Administration",
      email: "f.noor@northfield.edu",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=400",
      order: 1,
      status: "ACTIVE",
    },
    {
      name: "Mahmud Karim",
      designation: "Head of Science",
      department: "Science",
      qualification: "M.Sc. in Physics",
      email: "m.karim@northfield.edu",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=400",
      order: 2,
      status: "ACTIVE",
    },
    {
      name: "Sara Jahan",
      designation: "Senior Teacher",
      department: "English Literature",
      qualification: "M.A. in English",
      email: "s.jahan@northfield.edu",
      photoUrl: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=400",
      order: 3,
      status: "ACTIVE",
    },
    {
      name: "Nabil Chowdhury",
      designation: "Teacher",
      department: "Mathematics",
      qualification: "B.Sc. in Applied Mathematics",
      email: "n.chowdhury@northfield.edu",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=400",
      order: 4,
      status: "ACTIVE",
    },
    {
      name: "Nusrat Ahmed",
      designation: "Counselor",
      department: "Student Support",
      qualification: "M.S. in Child Psychology",
      email: "n.ahmed@northfield.edu",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=400",
      order: 5,
      status: "ACTIVE",
    },
  ];

  await prisma.teacher.deleteMany({ where: { schoolId: school.id } });
  for (const t of teachers) {
    await prisma.teacher.create({
      data: {
        schoolId: school.id,
        ...t,
      },
    });
  }

  // 8. Seed Notices
  const notices = [
    {
      title: "Summer schedule and office hours",
      category: "General",
      description: "During summer recess, administrative offices will operate from 9:00 AM to 2:00 PM, Monday through Thursday.",
      priority: "NORMAL",
      status: PublishStatus.PUBLISHED,
      publishDate: new Date("2025-05-12"),
    },
    {
      title: "Science Fair registration open",
      category: "Academic",
      description: "Students in Grades 7 through 12 can submit their project proposals to the STEM department office before May 20th.",
      priority: "HIGH",
      status: PublishStatus.PUBLISHED,
      publishDate: new Date("2025-05-10"),
    },
    {
      title: "Parent–teacher conferences scheduled",
      category: "Parents",
      description: "Appointments are now open for scheduling through the parent portal for mid-term review discussions.",
      priority: "NORMAL",
      status: PublishStatus.DRAFT,
      publishDate: new Date("2025-05-08"),
    },
    {
      title: "Annual sports day notice & trials",
      category: "Activities",
      description: "Track and field qualification trials will begin next Monday on the primary field.",
      priority: "NORMAL",
      status: PublishStatus.EXPIRED,
      publishDate: new Date("2025-05-02"),
    },
  ];

  await prisma.notice.deleteMany({ where: { schoolId: school.id } });
  for (const n of notices) {
    await prisma.notice.create({
      data: {
        schoolId: school.id,
        ...n,
      },
    });
  }

  // 9. Seed Events
  const events = [
    {
      title: "Inter-school Science Fair",
      category: "Academic",
      eventDate: new Date("2025-05-18T09:00:00Z"),
      time: "9:00 AM - 4:00 PM",
      venue: "Main Auditorium & Science Labs",
      description: "Showcase of over 80 innovation projects by regional high school scholars.",
      status: PublishStatus.PUBLISHED,
    },
    {
      title: "Spring Music Evening",
      category: "Arts",
      eventDate: new Date("2025-05-22T18:30:00Z"),
      time: "6:30 PM - 9:00 PM",
      venue: "Performing Arts Hall",
      description: "Performances by the Northfield Symphonic Orchestra, Chamber Choir, and Jazz Ensemble.",
      status: PublishStatus.PUBLISHED,
    },
    {
      title: "Parent Orientation for New Admissions",
      category: "Admissions",
      eventDate: new Date("2025-06-02T10:00:00Z"),
      time: "10:00 AM - 12:30 PM",
      venue: "Conference Center",
      description: "Curriculum overview, campus walk, and introductions with the department heads.",
      status: PublishStatus.DRAFT,
    },
    {
      title: "Class of 2025 Graduation Ceremony",
      category: "Commencement",
      eventDate: new Date("2025-06-15T15:00:00Z"),
      time: "3:00 PM - 6:00 PM",
      venue: "School Grounds Lawn",
      description: "Celebrating the achievements and commencement of our graduating senior cohort.",
      status: PublishStatus.PUBLISHED,
    },
  ];

  await prisma.schoolEvent.deleteMany({ where: { schoolId: school.id } });
  for (const e of events) {
    await prisma.schoolEvent.create({
      data: {
        schoolId: school.id,
        ...e,
      },
    });
  }

  // 10. Seed Gallery Albums
  const albums = [
    { title: "Campus Life & Community", slug: "campus-life", photosCount: 42, coverUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=800" },
    { title: "Science Fair 2025", slug: "science-fair-2025", photosCount: 28, coverUrl: "https://images.unsplash.com/photo-1562774053-701939374585?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=800" },
    { title: "Arts & Culture Exhibition", slug: "arts-culture", photosCount: 34, coverUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=800" },
    { title: "Annual Athletic Sports Day", slug: "sports-day", photosCount: 51, coverUrl: "https://images.unsplash.com/photo-1769209435699-9cc1fd8e7f57?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=600" },
  ];

  await prisma.galleryAlbum.deleteMany({ where: { schoolId: school.id } });
  for (const a of albums) {
    await prisma.galleryAlbum.create({
      data: {
        schoolId: school.id,
        ...a,
      },
    });
  }

  // 11. Seed Navigation Menu
  const navMenu = await prisma.navigationMenu.upsert({
    where: { schoolId_location: { schoolId: school.id, location: "HEADER" } },
    update: {},
    create: {
      schoolId: school.id,
      location: "HEADER",
    },
  });

  const menuItems = [
    { label: "Home", url: "/", pageSlug: "home", order: 1 },
    { label: "About Us", url: "/about", pageSlug: "about", order: 2 },
    { label: "Academics", url: "/academics", pageSlug: "academics", order: 3 },
    { label: "Teachers", url: "/teachers", pageSlug: "teachers", order: 4 },
    { label: "Admissions", url: "/admissions", pageSlug: "admissions", order: 5 },
    { label: "Notices", url: "/notices", pageSlug: "notices", order: 6 },
    { label: "Events", url: "/events", pageSlug: "events", order: 7 },
    { label: "Gallery", url: "/gallery", pageSlug: "gallery", order: 8 },
    { label: "Contact Us", url: "/contact", pageSlug: "contact", order: 9 },
  ];

  await prisma.navigationMenuItem.deleteMany({ where: { menuId: navMenu.id } });
  for (const item of menuItems) {
    await prisma.navigationMenuItem.create({
      data: {
        menuId: navMenu.id,
        ...item,
      },
    });
  }

  // 12. Seed SEO Config
  await prisma.seoConfig.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      siteTitle: "Northfield High School | Inspiring Excellence Since 1984",
      tagline: "A premier secondary institution offering AP courses, championship athletics, and STEAM programs.",
      metaDescription: "Welcome to Northfield High School. Discover our rigorous curriculum, student clubs, modern facilities, and vibrant school community.",
      metaKeywords: ["Northfield High", "High School NY", "AP Program", "College Prep", "STEM Education", "Arts and Athletics"],
      sitemapEnabled: true,
    },
  });

  // 13. Seed Integrations
  const integrations = [
    {
      type: "SCHOOL_ERP",
      name: "Northfield PowerSchool ERP",
      status: "CONNECTED",
      lastSyncAt: new Date(Date.now() - 12 * 60 * 1000), // 12 min ago
      syncHistory: [
        { action: "ERP automatic sync", detail: "36 records reviewed", timestamp: "12 min ago", status: "SUCCESS" },
        { action: "ERP teacher import", detail: "3 records awaiting approval", timestamp: "Yesterday", status: "PENDING" },
      ],
    },
    {
      type: "ADMISSION_GATEWAY",
      name: "Online Admission Portal API",
      status: "CONNECTED",
      lastSyncAt: new Date(Date.now() - 2 * 3600 * 1000), // 2 hrs ago
      syncHistory: [
        { action: "Admission API health check", detail: "Gateway responded in 142 ms", timestamp: "2 hrs ago", status: "HEALTHY" },
      ],
    },
  ];

  await prisma.schoolIntegration.deleteMany({ where: { schoolId: school.id } });
  for (const ig of integrations) {
    await prisma.schoolIntegration.create({
      data: {
        schoolId: school.id,
        ...ig,
      },
    });
  }

  // 14. Seed School Settings
  await prisma.schoolSettings.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      contactEmail: "admin@northfield.edu",
      supportPhone: "+1 (555) 234-5678",
      timezone: "America/New_York",
      dateFormat: "MM/DD/YYYY",
      language: "en",
      allowPublicAdmission: true,
      maintenanceMode: false,
    },
  });

  // 15. Seed Daily Analytics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.analyticsDaily.upsert({
    where: { schoolId_date: { schoolId: school.id, date: today } },
    update: {},
    create: {
      schoolId: school.id,
      date: today,
      pageViews: 34291,
      uniqueVisitors: 12842,
      bounceRate: 28.4,
      avgSessionSec: 215,
      topPages: [
        { path: "/", views: 14200, percentage: 41.4 },
        { path: "/admissions", views: 7600, percentage: 22.1 },
        { path: "/academics", views: 4800, percentage: 14.0 },
        { path: "/teachers", views: 3200, percentage: 9.3 },
      ],
      trafficSources: [
        { source: "Direct", percentage: 48 },
        { source: "Organic Search", percentage: 34 },
        { source: "Social Media", percentage: 12 },
        { source: "Referral", percentage: 6 },
      ],
      deviceBreakdown: {
        mobile: 62,
        desktop: 34,
        tablet: 4,
      },
    },
  });

  console.log("🚀 Database seeding completed successfully with all Northfield High demo data!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
