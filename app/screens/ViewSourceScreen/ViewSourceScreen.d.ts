// Avoid cycle by not re-exporting navigation types
// export { ViewSourceScreenProps };

export type ViewSourceScreenParams = {
  data: string;
  buttonTitle?: string;
  onPressButton?: () => void;
  screenTitle?: string;
  noWrap?: boolean;
}
