import { supabase } from "@/lib/supabase";

export async function abrirArquivoPrivado(bucket: string, referencia: string) {
  if (!referencia) return false;

  let caminho = referencia;
  if (/^https?:\/\//i.test(referencia)) {
    const marcador = `/storage/v1/object/public/${bucket}/`;
    const indice = referencia.indexOf(marcador);

    if (indice === -1) {
      window.open(referencia, "_blank", "noopener,noreferrer");
      return true;
    }

    caminho = decodeURIComponent(referencia.slice(indice + marcador.length));
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(caminho, 60);

  if (error || !data?.signedUrl) return false;

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  return true;
}
