import Image from "next/image";
import { LinkIcon } from "lucide-react";
import { clienteAdmin } from "@/lib/supabase/servidor";
import { FormCadastroAluno } from "./formulario";

export const metadata = { title: "Cadastro · Área do Aluno CA", robots: { index: false } };

export default async function Cadastro({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  let valido = false;
  if (/^[0-9a-f-]{36}$/i.test(codigo)) {
    const { data } = await clienteAdmin().from("convites_cadastro").select("usado_em, expira_em").eq("id", codigo).maybeSingle();
    valido = !!data && !data.usado_em && Date.parse(data.expira_em) > Date.now();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-menu px-6 py-12 text-menu-texto">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/brand/ca-icone.png" alt="CA" width={72} height={72} priority />
          <p className="mt-4 text-xs tracking-[0.3em] text-menu-texto/70">CONSULTORIA PREMIUM</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Seu cadastro</h1>
        </div>
        {valido ? (
          <FormCadastroAluno codigo={codigo} />
        ) : (
          <div className="rounded-2xl bg-white/10 p-5 text-center text-sm text-white">
            <LinkIcon className="mx-auto mb-2 size-6" />
            <p className="font-semibold">Esse link já foi usado ou venceu.</p>
            <p className="mt-1 text-white/70">Se você já se cadastrou, é só entrar em area-aluno-ca.vercel.app. Senão, pede um link novo ao Carlos.</p>
          </div>
        )}
      </div>
    </main>
  );
}
