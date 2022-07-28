import { S3Service } from './../services/S3Services';
import { ConfirmEmailRequest } from './../types/auth/ConfirmEmailRequest';
import { CognitoServices } from './../services/CognitoServices';
import type {Handler, APIGatewayEvent} from 'aws-lambda';
import { emailRegex, imageExtensionsAllowed, passwordRegex } from '../constants/Regexes';
import { UserRegisterRequest } from '../types/auth/UserRegisterRequest';
import { DefaultJsonResponse, formatDefaultResponse } from '../utils/formatResponsUtil';
import { User } from '../types/models/User';
import { UserModel } from '../models/UserModel';
import { parse } from 'aws-multipart-parser';
import { FileData } from 'aws-multipart-parser/dist/models';

export const register : Handler = async(event: APIGatewayEvent) 
    : Promise<DefaultJsonResponse> => {
    try{
        const {USER_POOL_ID, USER_POOL_CLIENT_ID, USER_TABLE, AVATAR_BUCKET} = process.env;
        if(!USER_POOL_ID || !USER_POOL_CLIENT_ID){
            return formatDefaultResponse(500, 'ENVs do Cognito não encontradas.');
        }

        if(!USER_TABLE){
            return formatDefaultResponse(500, 'ENVs da tabela de usuario do dynamo não encontrada.');
        }

        if(!AVATAR_BUCKET){
            return formatDefaultResponse(500, 'ENVs do bucket de avatar não encontrada.');
        }

        if(!event.body){
            return formatDefaultResponse(400, 'Parâmetros de entrada inválidos');
        }

        const formData = parse(event, true);
        const file = formData.file as FileData;
        const name = formData.name as string;
        const email = formData.email as string;
        const password = formData.password as string;

        if(!email || !email.match(emailRegex)){
            return formatDefaultResponse(400, 'Email inválido');
        }

        if(!password || !password.match(passwordRegex)){
            return formatDefaultResponse(400, 'Senha inválida');
        }

        if(!name || name.trim().length < 2){
            return formatDefaultResponse(400, 'Nome inválido');
        }

        if(file && !imageExtensionsAllowed.exec(file.filename)){
            return formatDefaultResponse(400, 'Extensão informada do arquivo não é válida');
        }

        const cognitoUser = await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).signUp(email, password);

        let key = undefined;
        if(file){
            key = await new S3Service().saveImage(AVATAR_BUCKET, 'avatar', file);
        }

        const user = {
            name,
            email,
            cognitoId: cognitoUser.userSub,
            avatar: key
        } as User;

        await UserModel.create(user);
        return formatDefaultResponse(200, 'Usuário cadastrado com sucesso!');
    }catch(error){
        console.log('Error on register user:', error);
        return formatDefaultResponse(500, 'Erro ao cadastrar usuario! Tente novamente ou contacte o administrador do sistema.');
    }
}

export const confirmEmail : Handler = async(event: APIGatewayEvent) : 
    Promise<DefaultJsonResponse> =>{
    try{

        const {USER_POOL_ID, USER_POOL_CLIENT_ID} = process.env;
        if(!USER_POOL_ID || !USER_POOL_CLIENT_ID){
            return formatDefaultResponse(500, 'ENVs do Cognito não encontradas.');
        }

        if(!event.body){
            return formatDefaultResponse(400, 'Parâmetros de entrada inválidos');
        }

        const request = JSON.parse(event.body) as ConfirmEmailRequest;
        const {email, verificationCode} = request;

        if(!email || !email.match(emailRegex)){
            return formatDefaultResponse(400, 'Email inválido');
        }
        
        if(!verificationCode || verificationCode.length !== 6){
            return formatDefaultResponse(400, 'Código inválido');
        }

        await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).confirmEmail(email, verificationCode);
        return formatDefaultResponse(200, 'Usuário verificado com sucesso!');
    }catch(error){
        console.log('Error on confirm user:', error);
        return formatDefaultResponse(500, 'Erro ao confirmar usuario! Tente novamente ou contacte o administrador do sistema.');
    }
}