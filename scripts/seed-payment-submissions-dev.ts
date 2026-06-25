import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function main(): Promise<void> {
  await prisma.billingPaymentSubmission.deleteMany();

  const alpha = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey: "manager@store-alpha.local" },
  });
  const royal = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey: "owner@royal-time.local" },
  });
  const luxe = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey: "bags@luxebags.local" },
  });

  await prisma.billingPaymentSubmission.createMany({
    data: [
      {
        businessKey: "manager@store-alpha.local",
        businessName: alpha?.businessName ?? "Store Alpha Owner",
        businessEmail: "manager@store-alpha.local",
        invoiceNumber: alpha?.lastInvoiceNumber ?? "INV-SEED-ALPHA",
        amountInr: 11_800,
        upiVpa: "fineset@paytm",
        submittedByEmail: "manager@store-alpha.local",
        submittedByName: "Store Alpha Owner",
        status: "PENDING",
        createdAt: hoursAgo(2),
      },
      {
        businessKey: "owner@royal-time.local",
        businessName: royal?.businessName ?? "Rajesh Malhotra",
        businessEmail: "owner@royal-time.local",
        invoiceNumber: royal?.lastInvoiceNumber ?? "INV-SEED-ROYAL",
        amountInr: 17_700,
        upiVpa: "fineset@paytm",
        submittedByEmail: "owner@royal-time.local",
        submittedByName: "Rajesh Malhotra",
        status: "PENDING",
        createdAt: hoursAgo(5),
      },
      {
        businessKey: "owner@royal-time.local",
        businessName: royal?.businessName ?? "Rajesh Malhotra",
        businessEmail: "owner@royal-time.local",
        invoiceNumber: "INV-SEED-ROYAL-OLD",
        amountInr: 17_700,
        upiVpa: "fineset@paytm",
        submittedByEmail: "owner@royal-time.local",
        submittedByName: "Rajesh Malhotra",
        status: "NOT_RECEIVED",
        reviewedAt: hoursAgo(20),
        reviewedByEmail: "admin@fineset.local",
        createdAt: hoursAgo(48),
      },
      {
        businessKey: "bags@luxebags.local",
        businessName: luxe?.businessName ?? "Ananya Reddy",
        businessEmail: "bags@luxebags.local",
        invoiceNumber: luxe?.lastInvoiceNumber ?? "INV-SEED-LUXE",
        amountInr: 5_900,
        upiVpa: "fineset@paytm",
        submittedByEmail: "bags@luxebags.local",
        submittedByName: "Ananya Reddy",
        status: "RECEIVED",
        reviewedAt: hoursAgo(12),
        reviewedByEmail: "admin@fineset.local",
        createdAt: hoursAgo(30),
      },
    ],
  });

  const pending = await prisma.billingPaymentSubmission.count({
    where: { status: "PENDING" },
  });

  console.log(`Seeded billing payment submissions (${pending} pending for admin review).`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
