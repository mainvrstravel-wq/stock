import path from "node:path";
import { fileURLToPath } from "node:url";

import prismaPkg from "@prisma/client";
import XLSX from "xlsx";

const { PrismaClient } = prismaPkg;

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const excelPath = process.env.EXCEL_IMPORT_PATH
  ? path.resolve(projectRoot, process.env.EXCEL_IMPORT_PATH)
  : path.resolve(projectRoot, "..", "สรุปรายการวัสดุเดือน เม.ย.69.xlsx");

const MOCK_USERS = [
  { name: "สมศักดิ์ (แอดมินสโตร์)", role: "ADMIN", pin: "1111", avatar: "🔑", department: "ฝ่ายดูแลคลังกลาง" },
  { name: "ช่างน้อย เหล็กเส้น", role: "WORKER", pin: "2222", avatar: "👷‍♂️", department: "ทีมงานโครงสร้างเหล็ก" },
  { name: "ช่างเก่ง งานสถาปัตย์", role: "WORKER", pin: "3333", avatar: "👨‍🔧", department: "ทีมงานประกอบติดตั้ง" },
];

function toNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseFloat(String(value).replace(/,/g, "").trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getCell(row, index) {
  return row[index] ?? "";
}

function inferItemType(category, name, unit) {
  const text = `${category} ${name} ${unit}`;
  const consumableHints = ["สิ้นเปลือง", "ลวด", "เทป", "สี", "กาว", "ซิลิโคลน", "ทินเนอร์", "ใบ", "สกรู", "พุ๊ก", "ดิน", "น้ำยา"];
  return consumableHints.some((hint) => text.includes(hint)) ? "CONSUMABLE" : "RETURNABLE";
}

function inferSafetyStock(unit, itemType) {
  if (itemType === "CONSUMABLE") {
    if (["กล่อง", "ม้วน", "ลิตร", "กิโลกรัม"].includes(unit)) return 3;
    return 5;
  }
  return 2;
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

      const unit = String(getCell(row, 6)).trim() || "ชิ้น";
      const itemType = inferItemType(sheetName, name, unit);

      importedProducts.push({
        code: `STK${String(runningNumber).padStart(4, "0")}`,
        category: sheetName,
        name,
        unit,
        initialQty: toNumber(getCell(row, 2)),
        receivedQty: toNumber(getCell(row, 3)),
        issuedQty: toNumber(getCell(row, 4)),
        damagedQty: 0,
        lostQty: 0,
        safetyStock: inferSafetyStock(unit, itemType),
        itemType,
      });
      runningNumber += 1;
    }
  }

  await prisma.borrowRecord.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();

  await prisma.user.createMany({ data: MOCK_USERS });
  await prisma.product.createMany({ data: importedProducts });

  console.log(`Imported ${importedProducts.length} products and ${MOCK_USERS.length} users from ${excelPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
