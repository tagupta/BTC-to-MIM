import React, { Component } from 'react'
import styled from 'styled-components';
import CoffeeMakerOutlinedIcon from '@mui/icons-material/CoffeeMakerOutlined';
import './Header.css';

const AppHeader = styled.header`
    min-height: 16vh;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    color: #b406c4;
    font-family: monospace;
`;

export default class Header extends Component {
    render() {
        return (
            <AppHeader>
            <div style={{display: "contents"}}>
                <CoffeeMakerOutlinedIcon sx={{ fontSize: 40 }}/>   
                <h3><strong>Brew BTC to get MIM</strong></h3>              
            </div>
            </AppHeader>
        )
    }
}
