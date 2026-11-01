// Marca um e-mail como professor (cria o login se ainda não existir).
// Uso: npm run professor -- seu@email.com

import { clienteAdmin } from "./comum.ts";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Uso: npm run professor -- seu@email.com");
  process.exit(1);
}

const admin = clienteAdmin();

const { data: criado, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
let userId = criado?.user?.id;
if (error) {
  if (!/already|registered|exists/i.test(error.message)) throw error;
  // Já existe: procura o id
  for (let pagina = 1; !userId; pagina++) {
    const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (!data.users.length) break;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
  }
}
if (!userId) throw new Error("Não achei o usuário.");

const { error: e2 } = await admin.from("perfis").upsert({ id: userId, papel: "professor" });
if (e2) throw e2;
console.log("Pronto: esse e-mail agora é professor. Entre pelo /entrar.");
