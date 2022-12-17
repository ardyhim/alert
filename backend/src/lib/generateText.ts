import { Alert, AlertType } from "@prisma/client";

function generateText(msg: string, data: Alert) {
  msg = msg.replace("$name", data.name);
  msg = msg.replace("$message", data.message);
  if (data.type == AlertType.donation || AlertType.superChat) msg = msg.replace("$nominal", data.nominal!.toString());
  if (data.type == AlertType.membership) msg = msg.replace("$month", data.month!.toString());
  return msg;
}

export default generateText;