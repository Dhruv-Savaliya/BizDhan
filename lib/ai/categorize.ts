import { groqChat } from "@/lib/groq";

const EXPENSE_CATEGORIES = [
  "Rent",
  "Salary",
  "Utilities",
  "Raw Materials",
  "Marketing",
  "Travel",
  "Software",
  "Office Supplies",
  "Food & Entertainment",
  "Tax",
  "Insurance",
  "Equipment",
  "Miscellaneous",
] as const;

const INCOME_CATEGORIES = [
  "Sales Revenue",
  "Service Revenue",
  "Investment Return",
  "Freelance",
  "Rental Income",
  "Loan Received",
  "Grant",
  "Refund",
  "Miscellaneous",
] as const;

export async function suggestCategory(
  description: string,
  amount: number,
  type: "income" | "expense"
): Promise<string> {
  const allowedCategories =
    type === "expense" ? [...EXPENSE_CATEGORIES] : [...INCOME_CATEGORIES];

  const systemPrompt = `You are a financial categorization assistant for Indian SMEs. Given a transaction description and amount, return exactly one category name from this list based on type:

For EXPENSE: ${EXPENSE_CATEGORIES.join(", ")}
For INCOME: ${INCOME_CATEGORIES.join(", ")}

Return ONLY the category name, nothing else. No explanation.`;

  const userPrompt = `Type: ${type}, Amount: ₹${amount}, Description: ${description}`;

  try {
    const response = await groqChat({
      apiKey: process.env.GROQ_API_KEY ?? "",
      model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 20,
    });

    const category = response.trim();
    return allowedCategories.includes(category as (typeof allowedCategories)[number])
      ? category
      : "Miscellaneous";
  } catch (error) {
    console.error("Failed to suggest category with AI:", error);
    return "Miscellaneous";
  }
}
