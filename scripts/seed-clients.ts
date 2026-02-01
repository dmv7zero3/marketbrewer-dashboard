import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.DDB_TABLE_NAME || "marketbrewer-dashboard";
const DDB_ENDPOINT = process.env.DDB_ENDPOINT;

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION, endpoint: DDB_ENDPOINT })
);

type ClientSeed = {
  id: string;
  name: string;
  industry: string;
  industry_type: string;
  website?: string;
};

const CLIENTS: ClientSeed[] = [
  {
    id: "nash-and-smashed",
    name: "Nash & Smashed",
    industry: "Food & Beverage",
    industry_type: "Restaurant",
    website: "https://nashandsmashed.com",
  },
  {
    id: "street-lawyer-magic",
    name: "Street Lawyer Magic",
    industry: "Professional Services",
    industry_type: "Attorney",
  },
  {
    id: "the-babes-club",
    name: "The Babes Club",
    industry: "Beauty & Wellness",
    industry_type: "BeautySalon",
  },
  {
    id: "marketbrewer",
    name: "MarketBrewer",
    industry: "Professional Services",
    industry_type: "LocalBusiness",
    website: "https://marketbrewer.com",
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

async function seedClient(client: ClientSeed): Promise<void> {
  const now = nowIso();
  const businessItem = {
    PK: "BUSINESS",
    SK: `BUSINESS#${client.id}`,
    business_id: client.id,
    name: client.name,
    industry: client.industry,
    industry_type: client.industry_type,
    website: client.website || null,
    phone: null,
    email: null,
    gbp_url: null,
    primary_city: null,
    primary_state: null,
    created_at: now,
    updated_at: now,
    type: "business",
  };

  const questionnaireItem = {
    PK: `BUSINESS#${client.id}`,
    SK: "QUESTIONNAIRE",
    data: {},
    completeness_score: 0,
    created_at: now,
    updated_at: now,
    type: "questionnaire",
  };

  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: businessItem }));
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: questionnaireItem }));
}

async function run(): Promise<void> {
  for (const client of CLIENTS) {
    await seedClient(client);
    console.log(`[Seed Clients] Upserted ${client.name}`);
  }
}

run().catch((error) => {
  console.error("[Seed Clients] Failed", error);
  process.exit(1);
});
