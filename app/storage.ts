export class Storage {
  public save(val: string) {
    const title = this.getTitle(val);
    const existing = this.load();
    existing[title] = val;
    this.persist(existing);
  }

  public loadSingle(title: string): string {
    const loaded = this.load();
    return title in loaded ? loaded[title] : "";
  }

  public load(): { [k: string]: string } {
    const loaded = window.localStorage.getItem(this.storageKey());
    return loaded ? JSON.parse(loaded) : {};
  }

  public remove(title: string) {
    const loaded = this.load();
    delete loaded[title];
    this.persist(loaded);
  }

  private persist(val: { [k: string]: string }) {
    window.localStorage.setItem(this.storageKey(), JSON.stringify(val));
  }

  private getTitle(val: string): string {
    const lines = val.split("\n");
    let suffix = "";
    if (lines.length > 0 && lines[0].startsWith("#")) {
      suffix = " " + lines[0].substr(1).trim();
    }
    return getCurrentIsoDate() + suffix;
  }

  private storageKey(): string {
    return "savedCalculations";
  }
}

function getCurrentIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  let month = today.getMonth().toString();
  let day = today.getDate().toString();
  if (day.length < 2) {
    day = "0" + day;
  }
  if (month.length < 2) {
    month = "0" + month;
  }
  return `${year}-${month}-${day}`;
}
