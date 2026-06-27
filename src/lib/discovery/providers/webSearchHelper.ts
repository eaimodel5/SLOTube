import { RawCandidate } from "./providerInterface";
import { executeSearchViaGateway } from "../../search/searchGateway";
import { canonicalizeUrl } from "../../media/urlUtils";

export async function webSearch(
  query: string, 
  sourceId: string, 
  sourceName: string, 
  siteOperator?: string
): Promise<RawCandidate[]> {
  try {
    const res = await executeSearchViaGateway({
      query,
      includeDomains: siteOperator ? [siteOperator] : undefined,
      limit: 5
    });

    return res.map(r => ({
      title: r.title,
      description: r.snippet,
      sourceUrl: r.url,
      canonicalUrl: r.canonicalUrl || canonicalizeUrl(r.url),
      sourceId: sourceId, // preserve the caller's sourceId
      sourceName: sourceName, // preserve the caller's sourceName
      thumbnailUrl: r.thumbnailUrl,
      publishedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.error(`Web search via gateway failed for ${sourceId}:`, e);
    return [];
  }
}
