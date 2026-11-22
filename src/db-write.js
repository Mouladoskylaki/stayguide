// D1 meta.changes includes trigger effects. RETURNING reports the intended direct rows.
export const directWriteSucceeded=result=>result?.success===true&&Array.isArray(result.results)&&
 result.results.length===1&&result.results[0]?.applied===1;
