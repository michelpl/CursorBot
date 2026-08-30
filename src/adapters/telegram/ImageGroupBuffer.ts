// text Telegram media_group text"text message text group_id text"
// text"text groupId text + text"text
//
// text
//   const buf = new ImageGroupBuffer<MyItem>(200, (items) => emit(items));
//   buf.push(msg.media_group_id, myItem);   // groupId text undefined
//
// text groupId text undefined text
//
// text groupId text
//   - text groupIdtext + text debounce timer
//   - text push text timertext"text debounceMs text"text
//   - timer text fire text

export class ImageGroupBuffer<T> {
  // groupId text { text fire text, text debounce timer }
  private buckets = new Map<
    string,
    { items: T[]; timer: ReturnType<typeof setTimeout> }
  >();
  private disposed = false;

  constructor(
    private readonly debounceMs: number,
    private readonly fire: (items: T[]) => void,
  ) {}

  // textgroupId text
  push(groupId: string | undefined, item: T): void {
    if (this.disposed) return;
    if (!groupId) {
      // text buckettext
      this.fire([item]);
      return;
    }
    const bucket = this.buckets.get(groupId);
    if (bucket) {
      // text debounce timertext
      clearTimeout(bucket.timer);
      bucket.items.push(item);
      bucket.timer = setTimeout(() => this.flush(groupId), this.debounceMs);
    } else {
      // text timer
      const timer = setTimeout(() => this.flush(groupId), this.debounceMs);
      this.buckets.set(groupId, { items: [item], timer });
    }
  }

  // disposetext timertext
  dispose(): void {
    this.disposed = true;
    for (const b of this.buckets.values()) clearTimeout(b.timer);
    this.buckets.clear();
  }

  // text fire text
  private flush(groupId: string): void {
    const bucket = this.buckets.get(groupId);
    if (!bucket) return;
    this.buckets.delete(groupId);
    this.fire(bucket.items);
  }
}
