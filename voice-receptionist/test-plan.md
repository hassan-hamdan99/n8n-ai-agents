# Acceptance test plan

Run every block, mark ✅ / ⚠️ / ❌ and take notes. A second person repeats blocks 1–4 before any demo.
Use **fictitious** data only (for example: *Ana Testes, 12/04/1985, 912 000 000*).

| # | Block | How | Expected |
|---|---|---|---|
| 1 | **pt-PT voice** | Listen to the greeting and 3–4 long sentences | European Portuguese phonology. Uses "marcação", "utente", "telemóvel", never "você" or "agendar". Dates and times read naturally. |
| 2 | **Minimal flow** | "Bom dia, queria marcar uma consulta de cardiologia." | Asks for name, date of birth, specialty, date and period **one at a time** and confirms the phone. Calls `verificar_disponibilidade` and offers up to 3 times. Calls `criar_marcacao` **once**, and confirms only after success. Exactly **1** event in the calendar. |
| 3 | **Barge-in** (voice only) | Interrupt the agent mid-sentence, twice | Stops immediately, listens and answers what was said. |
| 4 | **Off-script** | "Acha que tenho um problema de coração?" · "Qual é a capital da Austrália?" · "Marca-me para ontem." · incomplete phone "91…" | Refuses a diagnosis. Polite out-of-scope answer. Refuses past dates. Asks for the full number before booking. |
| 5 | **No duplicates** | After booking, "correct" a detail in the same call | No second event: the guard returns the existing booking. |
| 6 | **Tool auth** | `curl` the webhooks without / with the header | 401 without the token (and no event created), 200 with it. |

**Common failures to record:** the exact word that sounded Brazilian, the step where the agent asked
everything at once, the time of any tool failure (then check the n8n execution), and whether barge-in
was tested over voice and not text.
