import { LoginRequest } from './../types/login/LoginRequest';
import { APIGatewayEvent, Handler } from "aws-lambda";
import { CognitoServices } from "../services/CognitoServices";
import { DefaultJsonResponse, formatDefaultResponse } from "../utils/formatResponsUtil";
import { validateEnvs } from '../utils/environmentsUtils';

export const handler: Handler = async (event: APIGatewayEvent):
    Promise<DefaultJsonResponse> => {
    try {
        const { USER_POOL_ID, USER_POOL_CLIENT_ID, error } = validateEnvs(['USER_POOL_ID',
            'USER_POOL_CLIENT_ID']);
        if (error) {
            return formatDefaultResponse(500, error);
        }

        if (!event.body) {
            return formatDefaultResponse(400, 'Parâmetros de entrada inválidos');
        }

        const request = JSON.parse(event.body) as LoginRequest;
        const { login, password } = request;

        if (!password || !login) {
            return formatDefaultResponse(400, 'Parâmetros de entrada inválidos');
        }

        const result = await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).login(login, password);
        return formatDefaultResponse(200, undefined, result);
    } catch (error) {
        console.log('Error on login user:', error);
        return formatDefaultResponse(500, 'Erro ao autenticar usuario! Tente novamente ou contacte o administrador do sistema.');
    }
}