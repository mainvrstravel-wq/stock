import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient, TransactionType } from "@prisma/client";
import XLSX from "xlsx";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const excelPath = process.env.EXCEL_IMPORT_PATH
  ? path.resolve(projectRoot, process.env.EXCEL_IMPORT_PATH)
  : path.resolve(projectRoot, "..", "สรุปรายการวัสดุเดือน เม.ย.69.xlsx");

function toNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseFloat(String(value).replace(/,/g, "").trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getCell(row, index) {
  return row[index] ?? "";
}

async function main() {
  const workbook = XLSX.readFile(excelPath);
  const importedProducts = [];
  let runningNumber = 1;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const name = String(getCell(row, 1)).trim();
      if (!name) continue;

      const sortValue = String(getCell(row, 0)).trim();
      if (!/^\d+$/.test(sortValue)) continue;

      const openingBalance = toNumber(getCell(row, 5)) || toNumber(getCell(row, 2));
      const unit = String(getCell(row, 6)).trim() || "ชิ้น";

      importedProducts.push({
        code: `STK${String(runningNumber).padStart(4, "0")}`,
        category: sheetName,
        name,
        unit,
        openingBalance,
      });
      runningNumber += 1;
    }
  }

  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();

  for (const item of importedProducts) {
    const product = await prisma.product.create({
      data: item,
    });

    if (item.openingBalance > 0) {
      await prisma.transaction.create({
        data: {
          productId: product.id,
          type: TransactionType.INITIAL,
          quantity: item.openingBalance,
          note: "นำเข้ายอดคงเหลือเริ่มต้นจากไฟล์ Excel",
          date: new Date("2026-04-30T00:00:00.000Z"),
        },
      });
    }
  }

  console.log(`Imported ${importedProducts.length} products from ${excelPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
