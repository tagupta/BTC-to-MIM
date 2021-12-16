import React, { Component } from 'react';
import { v4 as uuidv4 } from 'uuid';
import styled from 'styled-components';
import { Container } from '@mui/material';

const Div = styled.div`
    margin-top: 50px;
    text-align: center;
    justify-content: center;
    border: 1px solid #b406c4;
    border-radius: 10px;
    margin-left : 50px;
    margin-right: 50px;
    margin-bottom: 30px;
`;
export default class Message extends Component {
    render() {

        const {msg, err} = this.props;
        return (
            <Container>
                <Div className='justify-content-center'>
                    <p>Status Information</p>
                    {msg.split("\n").map((line) => (
                    <p key={uuidv4()}>{line}</p>
                    ))}
                    {err ? <p style={{ color: "red" }}>{err}</p> : null}
                </Div>
            </Container>

            

            
        )
    }
}