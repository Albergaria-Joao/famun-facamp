import { LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "~/db.server";
import { requireAdminId } from "~/session.server";
import PDFDocument from "pdfkit";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireAdminId(request);

  try {
    const users = await getAllUsers();

    // Essa biblioteca funciona com um "stream" de escrita, para ir adicionando as coisas
    const doc = new PDFDocument({ autoFirstPage: false }); //cria pág vazia se não tiver false

    const chunks: Buffer[] = []; // esse stream funciona com base num buffer, em que vamos jogando bloquinhos (chunks)
    doc.on("data", (chunk) => chunks.push(chunk));
    const done = new Promise<Buffer>(
      (resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))), // Quando chegar no end lá embaixo, ele vai juntar todos esses blocos
    );

    for (const user of users) {
      doc.addPage({
        size: [189, 72], // Tamanho do PIMACO 6180 que o Palaro falou (66,7mm x 25,4mm) convertido para pt
        margins: { top: 15, left: 10, right: 10, bottom: 10 },
      });

      doc.font("Helvetica").fontSize(8).text(`Name: ${user.name}`);
      doc
        .font("public/fonts/3OF9_NEW.TTF")
        .fontSize(28)
        .text(`*${user.numericId}*`);

      // Em cada iteraçaõ do for, vai disparar o evento "data" lá em cima e dar push nesse bloco para o documento
    }

    doc.end();

    const body = await done; // fica esperando a promise done terminar para aí então retornar esse corpo do pdf
    // promise = resultado da operação assíncrona. O código continua executando, enquanto isso aqui espera retornar
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=usuarios.pdf",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Erro ao gerar PDF", { status: 500 });
  }
};

async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      name: true,
      numericId: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}
