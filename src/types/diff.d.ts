declare module 'diff' {
  export interface Change {
    value: string;
    added?: boolean;
    removed?: boolean;
  }

  export function diffWords(oldStr: string, newStr: string): Change[];
}
