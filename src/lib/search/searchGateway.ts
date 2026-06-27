import { SearchGatewayParams, SearchResultCandidate } from "./searchTypes";

export async function executeSearchViaGateway(params: SearchGatewayParams): Promise<SearchResultCandidate[]> {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      console.error(`Search API failed with status: ${response.status}`);
      // Fallback could be handled by the server itself or here
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error calling search API:`, error);
    return [];
  }
}
