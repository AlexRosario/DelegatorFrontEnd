export const ErrorMessage = ({
  message,
  show
}: {
  message: string;
  show: boolean;
}) => {
  return <div className="error-message">{show ? message : ''}</div>;
};
