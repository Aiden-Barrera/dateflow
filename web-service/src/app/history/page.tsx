import { HistoryPage } from "./history-page";

export default async function HistoryRoute() {
  return (
    <div data-history-page="present">
      <HistoryPage
        initialTokenState="present"
        initialHistory={null}
      />
    </div>
  );
}
