import { AuthType } from "../../AuthType";
import { DefaultAccountExperienceType } from "../../DefaultAccountExperienceType";
import { Offer, ReadCollectionOfferParams } from "../../Contracts/DataModels";
import { handleError } from "../ErrorHandlingUtils";
import { getSqlContainerThroughput } from "../../Utils/arm/generatedClients/2020-04-01/sqlResources";
import { getMongoDBCollectionThroughput } from "../../Utils/arm/generatedClients/2020-04-01/mongoDBResources";
import { getCassandraTableThroughput } from "../../Utils/arm/generatedClients/2020-04-01/cassandraResources";
import { getGremlinGraphThroughput } from "../../Utils/arm/generatedClients/2020-04-01/gremlinResources";
import { getTableThroughput } from "../../Utils/arm/generatedClients/2020-04-01/tableResources";
import { logConsoleProgress } from "../../Utils/NotificationConsoleUtils";
import { readOfferWithSDK } from "./readOfferWithSDK";
import { userContext } from "../../UserContext";

export const readCollectionOffer = async (params: ReadCollectionOfferParams): Promise<Offer> => {
  const clearMessage = logConsoleProgress(`Querying offer for collection ${params.collectionId}`);

  try {
    if (
      window.authType === AuthType.AAD &&
      !userContext.useSDKOperations &&
      userContext.defaultExperience !== DefaultAccountExperienceType.Table
    ) {
      return await readCollectionOfferWithARM(params.databaseId, params.collectionId);
    }

    return await readOfferWithSDK(params.offerId, params.collectionResourceId);
  } catch (error) {
    handleError(error, "ReadCollectionOffer", `Error while querying offer for collection ${params.collectionId}`);
    throw error;
  } finally {
    clearMessage();
  }
};

const readCollectionOfferWithARM = async (databaseId: string, collectionId: string): Promise<Offer> => {
  const subscriptionId = userContext.subscriptionId;
  const resourceGroup = userContext.resourceGroup;
  const accountName = userContext.databaseAccount.name;
  const defaultExperience = userContext.defaultExperience;

  let rpResponse;
  try {
    switch (defaultExperience) {
      case DefaultAccountExperienceType.DocumentDB:
        rpResponse = await getSqlContainerThroughput(
          subscriptionId,
          resourceGroup,
          accountName,
          databaseId,
          collectionId
        );
        break;
      case DefaultAccountExperienceType.MongoDB:
        rpResponse = await getMongoDBCollectionThroughput(
          subscriptionId,
          resourceGroup,
          accountName,
          databaseId,
          collectionId
        );
        break;
      case DefaultAccountExperienceType.Cassandra:
        rpResponse = await getCassandraTableThroughput(
          subscriptionId,
          resourceGroup,
          accountName,
          databaseId,
          collectionId
        );
        break;
      case DefaultAccountExperienceType.Graph:
        rpResponse = await getGremlinGraphThroughput(
          subscriptionId,
          resourceGroup,
          accountName,
          databaseId,
          collectionId
        );
        break;
      case DefaultAccountExperienceType.Table:
        rpResponse = await getTableThroughput(subscriptionId, resourceGroup, accountName, collectionId);
        break;
      default:
        throw new Error(`Unsupported default experience type: ${defaultExperience}`);
    }
  } catch (error) {
    if (error.code !== "NotFound") {
      throw error;
    }

    return undefined;
  }

  const resource = rpResponse?.properties?.resource;
  if (resource) {
    const offerId: string = rpResponse.name;
    const minimumThroughput: number =
      typeof resource.minimumThroughput === "string"
        ? parseInt(resource.minimumThroughput)
        : resource.minimumThroughput;
    const autoscaleSettings = resource.autoscaleSettings;

    if (autoscaleSettings) {
      return {
        id: offerId,
        autoscaleMaxThroughput: autoscaleSettings.maxThroughput,
        manualThroughput: undefined,
        minimumThroughput,
        offerReplacePending: resource.offerReplacePending === "true"
      };
    }

    return {
      id: offerId,
      autoscaleMaxThroughput: undefined,
      manualThroughput: resource.throughput,
      minimumThroughput,
      offerReplacePending: resource.offerReplacePending === "true"
    };
  }

  return undefined;
};
