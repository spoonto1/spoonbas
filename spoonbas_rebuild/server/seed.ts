import { storage } from "./storage";

const SEED_USERS = [
  {
    email: "tony@spoonbas.io",
    name: "Tony Spoon",
    password: "demo",
    role: "admin" as const,
  },
  {
    email: "maya@spoonbas.io",
    name: "Maya Ortega",
    password: "demo",
    role: "dispatcher" as const,
  },
  {
    email: "dev@spoonbas.io",
    name: "Dev Patel",
    password: "demo",
    role: "technician" as const,
  },
];

export async function runSeed() {
  const existing = await storage.listUsers();
  let userIdMap: Record<string, number> = {};
  for (const u of existing) userIdMap[u.email] = u.id;

  for (const u of SEED_USERS) {
    if (!userIdMap[u.email]) {
      const created = await storage.createUser(u);
      userIdMap[u.email] = created.id;
    }
  }

  // Seed a small but realistic queue of service calls (not test data).
  const calls = await storage.listServiceCalls();
  if (calls.length === 0) {
    const tonyId = userIdMap["tony@spoonbas.io"]!;
    const mayaId = userIdMap["maya@spoonbas.io"]!;
    const devId = userIdMap["dev@spoonbas.io"]!;

    const seeds = [
      {
        siteName: "Riverside Medical Tower",
        siteAddress: "1820 W Riverside Dr, Floor 6, Boise ID",
        contactName: "Jen Holloway",
        contactPhone: "(208) 555-0142",
        systemType: "AHU" as const,
        symptom: "Supply air temperature drift",
        description:
          "AHU-3 supply temp running 4-6F above setpoint since 04:30. Discharge damper looks correct, hunting on chilled-water valve. Patient floor reporting warm rooms.",
        priority: "high" as const,
        status: "triaged" as const,
        assignedToId: devId,
        createdById: mayaId,
      },
      {
        siteName: "Cascade Office Park - Building B",
        siteAddress: "4400 Cascade Ridge Pkwy, Bend OR",
        contactName: "Marcus Reilly",
        contactPhone: "(541) 555-0177",
        systemType: "VAV" as const,
        symptom: "VAV box stuck on second floor",
        description:
          "VAV-204 reads 0% airflow despite damper command 70%. Tenant in suite 210 has had no cooling since yesterday afternoon.",
        priority: "normal" as const,
        status: "dispatched" as const,
        assignedToId: devId,
        createdById: mayaId,
      },
      {
        siteName: "Hawthorne Public Library",
        siteAddress: "215 SE Hawthorne Blvd, Portland OR",
        contactName: "Director Anita Park",
        contactPhone: "(503) 555-0188",
        systemType: "Boiler" as const,
        symptom: "Boiler short-cycling, low DHW temp",
        description:
          "Lead boiler firing for 90 seconds then locking out. Domestic hot water in restrooms reports 88F. No alarm history yet.",
        priority: "critical" as const,
        status: "new" as const,
        assignedToId: null,
        createdById: tonyId,
      },
      {
        siteName: "Sapphire Tower Hotel",
        siteAddress: "900 Marquam Hill Rd, Portland OR",
        contactName: "Engineering Desk",
        contactPhone: "(503) 555-0150",
        systemType: "Chiller" as const,
        symptom: "Chiller condenser approach high",
        description:
          "Condenser approach trending 12F vs design 4F. Cleaning and tower cell rotation requested. Chiller still loaded but efficiency degraded.",
        priority: "normal" as const,
        status: "on_site" as const,
        assignedToId: devId,
        createdById: tonyId,
      },
      {
        siteName: "Northgate Distribution Center",
        siteAddress: "5125 N Lombard St, Portland OR",
        contactName: "Plant Lead - Aisha N.",
        contactPhone: "(503) 555-0169",
        systemType: "BAS Controller" as const,
        symptom: "BAS controller offline",
        description:
          "JACE on dock controller offline since maintenance window. Need on-site reboot and IP confirmation.",
        priority: "low" as const,
        status: "resolved" as const,
        assignedToId: devId,
        createdById: mayaId,
      },
    ];

    for (const s of seeds) {
      const { createdById, assignedToId, ...rest } = s;
      const created = await storage.createServiceCall(
        { ...rest, assignedToId: assignedToId ?? null },
        createdById,
      );
      // Add a couple of realistic checklist items
      const seedChecklist: string[] = [];
      switch (s.systemType) {
        case "AHU":
          seedChecklist.push(
            "Trend supply, return, mixed-air temps over last 24h",
            "Verify CHW valve actuator stroke and feedback",
            "Check OAT and economizer mode against schedule",
          );
          break;
        case "VAV":
          seedChecklist.push(
            "Verify VAV damper actuator response at min and max",
            "Confirm primary airflow sensor zero",
            "Check zone setpoint and override status",
          );
          break;
        case "Boiler":
          seedChecklist.push(
            "Pull last 50 alarm/lockout records",
            "Verify gas pressure at burner",
            "Inspect flame signal and ignition sequence",
          );
          break;
        case "Chiller":
          seedChecklist.push(
            "Check condenser tube cleanliness factor",
            "Rotate and verify each cooling-tower cell",
            "Trend approach and CHW deltaT",
          );
          break;
        case "BAS Controller":
          seedChecklist.push(
            "Power-cycle controller and verify boot",
            "Confirm assigned IP and supervisor connection",
            "Pull controller log after reconnect",
          );
          break;
        default:
          seedChecklist.push("Site walk and visual inspection");
      }
      let pos = 0;
      for (const label of seedChecklist) {
        await storage.createChecklistItem(created.id, {
          label,
          done: (s.status as string) === "resolved" || (s.status as string) === "closed",
          position: pos++,
        });
      }

      // Conversation
      if (s.assignedToId) {
        await storage.createMessage(created.id, mayaId, {
          body: `Assigning to ${
            s.assignedToId === devId ? "Dev" : "tech"
          }. Customer contact is ${s.contactName} at ${s.contactPhone}.`,
        });
        await storage.createMessage(created.id, s.assignedToId, {
          body:
            s.status === "on_site"
              ? "Rolling now, ETA 30 minutes."
              : "Acknowledged, reviewing trends before dispatch.",
        });
      } else {
        await storage.createMessage(created.id, tonyId, {
          body: "New ticket from facilities call line. Needs triage.",
        });
      }
    }
  }
}
