import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as bodyParser from "body-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.use(bodyParser.json({ limit: "50mb" }));
	app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

	app.enableCors();
	app.useGlobalPipes(new ValidationPipe());

	console.log(process.env.PORT);
	console.log("Starting server on port", process.env.PORT ?? 8080);

	await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
