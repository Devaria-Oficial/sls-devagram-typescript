import { CognitoServices } from './../services/CognitoServices';
import type {Handler, APIGatewayEvent} from 'aws-lambda';
import { emailRegex, passwordRegex } from '../constants/Regexes';
import { UserRegisterRequest } from '../types/auth/UserRegisterRequest';
import { DefaultJsonResponse, formatDefaultResponse } from '../utils/formatResponsUtil';

export const register : Handler = async(event: APIGatewayEvent) 
    : Promise<DefaultJsonResponse> => {
    try{
        const {USER_POOL_ID, USER_POOL_CLIENT_ID} = process.env;
        if(!USER_POOL_ID || !USER_POOL_CLIENT_ID){
            return formatDefaultResponse(500, 'ENVs do Cognito não encontradas.');
        }

        if(!event.body){
            return formatDefaultResponse(400, 'Parâmetros de entrada inválidos');
        }

        const request = JSON.parse(event.body) as UserRegisterRequest;
        const {name, password, email} = request;

        if(!email || !email.match(emailRegex)){
            return formatDefaultResponse(400, 'Email inválido');
        }

        if(!password || !password.match(passwordRegex)){
            return formatDefaultResponse(400, 'Senha inválida');
        }

        if(!name || name.trim().length < 2){
            return formatDefaultResponse(400, 'Nome inválido');
        }

        await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).signUp(email, password);

        return formatDefaultResponse(200, 'Usuário cadastrado com sucesso!');
    }catch(error){
        console.log('Error on register user:', error);
        return formatDefaultResponse(500, 'Erro ao cadastrar usuario! Tente novamente ou contacte o administrador do sistema.');
    }
}