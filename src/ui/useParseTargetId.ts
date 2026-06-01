import { Effect } from "effect";
import { useEffect, useState } from "react";
import type { ParseTargetId } from "../core/billable";
import { runtime } from "../core/runtime";
import { Submitter } from "../core/services/Submitter";

const fetchParseTargetId = Effect.gen(function* () {
  const submitter = yield* Submitter;
  return submitter.parseTargetId;
});

const rejectAll: ParseTargetId = () => null;

export const useParseTargetId = (): ParseTargetId => {
  const [fn, setFn] = useState<ParseTargetId>(() => rejectAll);
  useEffect(() => {
    void runtime.runPromise(fetchParseTargetId).then((f) => setFn(() => f));
  }, []);
  return fn;
};
