/* 
  AUTOGENERATED FILE
  Do not manually edit
  Run "npm run generateARMClients" to regenerate
*/

import * as Types from "./types";

/* Retrieves the metrics determined by the given filter for the given database account and region. */
export async function listMetrics(
  subscriptionId: string,
  resourceGroupName: string,
  accountName: string,
  region: string
): Promise<Types.MetricListResult> {
  return window
    .fetch(
      `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.DocumentDB/databaseAccounts/${accountName}/region/${region}/metrics`,
      { method: "get" }
    )
    .then(response => response.json());
}