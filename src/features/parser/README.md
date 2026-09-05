# Request parser

parse-request.ts implements a pure English keyword parser returning ParsedRequest. It supports activity aliases, role phrases, day/time extraction, and explicit language/group preferences. "Teach me" means learner; "teach someone" means teacher. Age is never derived from "uncle". Unknown activities, relative dates, and ambiguous availability are returned for confirmation. request-form.tsx provides that editable confirmation step. No OpenAI key is needed.
