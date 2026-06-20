import { fetchContracts } from "@/lib/bitget";

export async function GET() {
  const contracts = await fetchContracts();
  return Response.json(contracts);
}
