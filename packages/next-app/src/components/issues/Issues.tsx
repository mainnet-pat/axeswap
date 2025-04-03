import { CommonState } from "@xmr-bch-swap/swap";
import { Connectivity } from "./Connectivity";
import { Fallback } from "./Fallback";
import { FundBchSwaplock } from "./FundBchSwaplock";
import { FundXmrSwaplock } from "./FundXmrSwaplock";
import { AwaitXmrConfirmations } from "./AwaitXmrConfirmations";
import { AwaitBchConfirmations } from "./AwaitBchConfirmations";

const getIssueResolutionComponent = (state: CommonState) => {
  switch (state.currentState) {
    case "checkConnectivity":
      return <Connectivity state={state} />
    case "fundBchSwaplock":
      return <FundBchSwaplock state={state} />
    case "fundXmrSwaplock":
      return <FundXmrSwaplock state={state} />
    case "awaitXmrSwaplockConfirmations":
      return <AwaitXmrConfirmations state={state} requiredConfirmations={5} />
    case "awaitRestXmrSwaplockConfirmations":
      return <AwaitXmrConfirmations state={state} requiredConfirmations={10} />
    case "awaitBchSwaplockConfirmations":
      return <AwaitBchConfirmations state={state} requiredConfirmations={1} />
    case "initiateBchRefund":
      return <AwaitBchConfirmations state={state} requiredConfirmations={2} />
    case "refundXmr":
      return <AwaitXmrConfirmations state={state} requiredConfirmations={10} />
    case "awaitXmrRefundOrRecoverBch":
      return <AwaitBchConfirmations state={state} requiredConfirmations={5} />
    default:
      return <Fallback state={state} />
  }
}

export function Issues({state} : {state: CommonState}) {
  return <>{getIssueResolutionComponent(state)}</>
}
